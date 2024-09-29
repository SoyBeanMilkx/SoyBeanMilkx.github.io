# 简介Apatch

**[What is APatch? | APatch Docs](https://apatch.dev/what-is-apatch.html)**

- 一种新的基于内核的 Android 设备 root 解决方案。
- APM：支持类似于 Magisk 的模块。
- KPM：支持允许您将任何代码注入内核的模块（需要内核功能`inline-hook`并`syscall-table-hook`启用）。
- APatch 依赖于[KernelPatch](https://github.com/bmax121/KernelPatch/)。
- APatch UI 和 APModule 源代码均源自[KernelSU](https://github.com/tiann/KernelSU)并经过修改。

# KernelModule

`KernelModule`的文件后缀为`.kpm`,即**kernel patch module**，实际上就是.ko/.lpm文件，因为，android是基于linux的，内核模块机制也是继承自linux。本质上.kpm就是一个.so文件，在开发中甚至可以直接使用ndk工具链编译生成它。但是官方给的文档中是使用**makefile**进行的编译，而我尝试在windows下使用cmake进行编译，但是提示我缺少`prink`等内核函数，无奈之下使用linux进行编译，在windows下编写代码。



# 编译环境

首先电脑需要拥有linux系统。我是用的是**wsl2**，这个东西网上有很多教程就不赘述了

其次，我们需要编译运行的目标平台是android(arm架构，ap貌似不支持32位，所以选择**arm64**的编译工具链)

[工具链下载地址](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads)

由于我们是在linux系统上编译，但我们运行linux的电脑是x86_64架构的，所以使用

[arm-gnu-toolchain-13.3.rel1-x86_64-aarch64-none-elf.tar.xz](https://developer.arm.com/-/media/Files/downloads/gnu/13.3.rel1/binrel/arm-gnu-toolchain-13.3.rel1-x86_64-aarch64-none-elf.tar.xz) 即可。但是我尝试使用windows下的工具链，使用cmake去编译最终失败了，我也懒得排查和解决了。有大佬有解决方案的话求求你教教我，因为我真的很喜欢用clion。

下载好之后，把它拷贝到linux系统中，通常放在`/opt`下，使用`tar`命令解压，然后`vi etc/profile`，在最后一行输入`export PATH=$PATH:你解压之后的路径/bin`配置一下环境变量即可。最后输入`aarch64-none-elf-gcc -v`查看能否正常输出版本就行了



完成以上工作之后你就可以正常编译kpm了，我们可以去官网下载demo编译运行一下。

[KernelPatch地址](https://github.com/bmax121/KernelPatch)

由于刚刚配置好了环境，cc和ld的值直接指定即可。

```makefile
CC = aarch64-none-elf-gcc
LD = aarch64-none-elf-ld
```

进入makefile所在的目录，运行`make`即可。

接下来在终端中加载模块`insmod PATH/hello.kpm`或者去apatch中手动刷入，但是需要重启，不方便调试。我推荐第一种。

也可以手动：

Linux系统加载哪些内核模块，和配置文件有关系。

1. 模块保存在`/lib/modules/`下。
2. 使用`/etc/modules-load.d/`来配置系统启动时加载哪些模块。
3. 使用`/etc/modprobe.d/`下配置模块加载时的一些参数



接下来就可以愉快的玩耍了，你的手机将几乎完全属于你。




