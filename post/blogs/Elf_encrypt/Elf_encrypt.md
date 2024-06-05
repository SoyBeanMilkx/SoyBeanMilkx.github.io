# *愿世界和平*

## so文件的加密

对so的保护分为两种情况

1. 有源码
   
   - 这个加密方式就太多了，而且并不是主流，就不说了

2. 无源码
   
   - 这个就比较有意思了，也是目前加固的主流方向，接下来就仔细说说

### 简介

底层涉及很多操作，但一句话就可以概括so文件加解密的原理。我们知道so本质是个elf文件，elf文件有特定的格式，我们只需根据格式索引到对应函数位置，直接对其二进制字符进行加密即可，至此便完成了加密过程。但是我们加密之后就破坏了原本so的结构，直接运行肯定是会报错的。而我们知道在linux下万物皆文件，程序运行时可通过/proc/pid号/maps文件，找到so文件映射的内存虚拟地址，再根据so文件格式的索引一步一步找到函数位置，接着就可以对其进行解密了。

so文件的文件头

```c
#define EI_NIDENT 16
typedef struct elf32_hdr{
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 unsigned char e_ident[EI_NIDENT];
 Elf32_Half e_type;
 Elf32_Half e_machine;
 Elf32_Word e_version;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Addr e_entry;
 Elf32_Off e_phoff;
 Elf32_Off e_shoff;
 Elf32_Word e_flags;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Half e_ehsize;
 Elf32_Half e_phentsize;
 Elf32_Half e_phnum;
 Elf32_Half e_shentsize;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Half e_shnum;
 Elf32_Half e_shstrndx;
} Elf32_Ehdr;
```

详细的就不说了，简单看下，开始的16字节是ELF文件魔数，然后是一些文件信息硬件、版本之类的，重点在几个变量 **e_phoff**、**e_shoff**、**e_phentsize**、**e_phnum**、**e_shentsize**、**e_shnum**、**e_shstrndx**。要知道这几个变量的含义首先要清楚，ELF文件的结构在链接时和执行时是不同的。一般情况下（也就是我们看到的情况），ELF文件内部分为多个**section**，每个**section**保存不同的信息，比如.**shstrtab**保存段信息的字符串，.**text**装载可执行代码等等。这些不同的**section**根据不同的内容和作用会有不同的读写和执行权限，但是这些section的权限是没有规律的，比如第一个**section**的权限是只读，第二个是读写、第三个又是只读。如果在内存当中直接以这种形式存在，那么文件在执行的时候会造成权限控制难度加大，导致不必要的消耗。所以当我们将so文件链接到内存中时，写入的不是**section**，而是**segment**，每个**segment**可以看作是相同权限的**section**的集合。也就是说在内存当中一个**segment**对应**N**个**section**（**N>=0**），而这些**section**和**segment**的信息都会被保存在文件中。理解了这个，再看那几个变量。**e_phoff**是**segment**头部偏移的位置，**e_phentsize**是**segment**头部的大小，**e_phnum**指**segment**头部的个数（每个**segment**都有一个头部，这些头部是连续放在一起的，头部中有变量指向这些**segment**的具体内容）。同样**e_shoff**、**e_shentsize**、**e_shnum**分别表示**section**的头部偏移、头部大小、头部数量。最后一个**e_shstrndx**有点难理解。ELF文件中的每个section都是有名字的 如.**data**、.**text**、.**rodata**，每个名字都是一个字符串，既然是字符串就需要一个字符串池来保存，而这个字符串池也是一个**section**，或者说准备一个**section**用来维护一个字符串池，这个字符串池保存了其他**section**以及它自己的名字。这个特殊的**section**叫做.**shstrtab**。由于这个**section**很特殊，所以把它单独标出来。我们也说了，所有**section**的头部是连续存放在一起的，类似一个数组，**e_shstrndx**变量是.**shstrtab**在这个数组中的下标。  

**section**的头部结构如下

```c
typedef struct elf32_shdr {
 Elf32_Word sh_name;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Word sh_type;
 Elf32_Word sh_flags;
 Elf32_Addr sh_addr;
 Elf32_Off sh_offset;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Word sh_size;
 Elf32_Word sh_link;
 Elf32_Word sh_info;
 Elf32_Word sh_addralign;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Word sh_entsize;
} Elf32_Shdr;
```

**segment**的头部结构如下

```c
typedef struct elf32_phdr{
 Elf32_Word p_type;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Off p_offset;
 Elf32_Addr p_vaddr;
 Elf32_Addr p_paddr;
 Elf32_Word p_filesz;
/* WARNING: DO NOT EDIT, AUTO-GENERATED CODE - SEE TOP FOR INSTRUCTIONS */
 Elf32_Word p_memsz;
 Elf32_Word p_flags;
 Elf32_Word p_align;
} Elf32_Phdr;
```

由上述信息可知：

1. **e_phoff = sizeof(e_ehsize);**

2. **整个ELF文件大小 = e_shoff + e_shnum * sizeof(e_shentsize) + 1**

由于内存中只存在**segment**，所以最简单的加固方式就是破坏原so的**section**结构，这样so可以正常执行但是不能被ida等反汇编工具正确打开，不过这种加固很好过。

##### 回到正题，我们继续说加密：

加密的流程我们设想一下，可以是这样 解析ELF->找到字节码->对字节码加密  
解密就是 解析ELF->找到字节码->对字节码解密 。详细一点就是通过偏移、个数等信息找到**section**的头部，然后看是不是我们要找的**section**（通过名字）。找到后通过**sh_offset**（偏移）和**sh_size**（大小），就找到这个**section**的内容，整体加密。

### 懒得实现了，以后再说吧，大概原理就是这样。真是辛苦我了。

### 算了还是写一下吧...

```c
#include <jni.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <elf.h>
#include <sys/mman.h>
#include <android/log.h>

void init_getString() __attribute__((constructor));
unsigned long getLibAddr();

void clearcache(char* begin, char *end)
{
	const int syscall = 0xf0002;
	__asm __volatile (
		"mov	 r0, %0\n"
		"mov	 r1, %1\n"
		"mov	 r7, %2\n"
		"mov     r2, #0x0\n"
		"svc     0x00000000\n"
		:
		:	"r" (begin), "r" (end), "r" (syscall)
		:	"r0", "r1", "r7"
		);
}

void init_getString(){
  char name[15];
  unsigned int nblock;
  unsigned int nsize;
  unsigned long base;
  unsigned long text_addr;
  unsigned int i;
  Elf32_Ehdr *ehdr;
  Elf32_Shdr *shdr;

  base = getLibAddr();

  ehdr = (Elf32_Ehdr *)base;
  text_addr = ehdr->e_shoff + base;

  nblock = ehdr->e_entry >> 16;
  nsize = ehdr->e_entry & 0xffff;

  if(mprotect((void *) base, 4096 * nsize, PROT_READ | PROT_EXEC | PROT_WRITE) != 0){
	  __android_log_print(ANDROID_LOG_INFO, "JNITag", "mem privilege change failed");
  }

  for(i=0;i< nblock; i++){
    char *addr = (char*)(text_addr + i);
    *addr = ~(*addr);
  }

  if(mprotect((void *) base, 4096 * nsize, PROT_READ | PROT_EXEC) != 0){
	  __android_log_print(ANDROID_LOG_INFO, "JNITag", "mem privilege change failed");
  }

  clearcache((char*)text_addr, (char*)(text_addr + nblock -1));

  __android_log_print(ANDROID_LOG_INFO, "JNITag", "Decrypt success");
}

unsigned long getLibAddr(){
  unsigned long ret = 0;
  char name[] = "libdemo.so";
  char buf[4096], *temp;
  int pid;
  FILE *fp;
  pid = getpid();
  sprintf(buf, "/proc/%d/maps", pid);
  fp = fopen(buf, "r");
  if(fp == NULL)
  {
    puts("open failed");
    goto _error;
  }
  while(fgets(buf, sizeof(buf), fp)){
    if(strstr(buf, name)){
      temp = strtok(buf, "-");
      ret = strtoul(temp, NULL, 16);
      break;
    }
  }
_error:
  fclose(fp);
  return ret;
}

```

所谓有源码加密和无源码加密的区别不过是解密函数存储的位置，解密函数执行的时机都是在 **.init_array**附近，有源码的话可以直接写在同一个so的.init_array函数里，没有源码的话会稍微复杂一些，但是由于已知解密的时机，我们可以把解密函数放在另一个so里，先加载需要的so，再加载包含解密函数的so，解密函数被调用，解密了被加密的segment，从而实现了运行过程中动态的解密。



**参考文献:**

- [无源码加解密实现](https://bbs.kanxue.com/thread-192047.htm)

- [SO加密 ](https://nszdhd1.github.io/2020/08/27/SO%E5%8A%A0%E5%AF%86/#/1-3-%E7%A8%8B%E5%BA%8F%E5%A4%B4%E8%A1%A8-Program-header-table)
