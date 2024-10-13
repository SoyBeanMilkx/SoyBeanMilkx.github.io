# Apatch_Kernel_Module Clion开发环境配置

## 一.下载wsl2

这个网上有很多教程，姑且不赘述了

## 二.在wsl2中配置工具链

工具链需要下载两个，一个是[arm-gnu-toolchain-13.3.rel1-x86_64-aarch64-none-elf.tar.xz](https://developer.arm.com/-/media/Files/downloads/gnu/13.3.rel1/binrel/arm-gnu-toolchain-13.3.rel1-x86_64-aarch64-none-elf.tar.xz)这个工具链用于实际的编译。另一个则是[NDK 下载 ](https://developer.android.google.cn/ndk/downloads?hl=zh-cn)这个用于cmake构建。

下载好之后进行一些环境变量的配置，这里就不多赘述。

## 三.在Clion中配置工具链和cmake

工具链配置如图所示

![](D:\Note\Image\ApatchKPM\2024-10-13-13-10-50-image.png)

cmake配置如图所示

![](D:\Note\Image\ApatchKPM\2024-10-13-13-11-35-image.png)

注意Cmake选项中添加这段

```cmake
-DCMAKE_TOOLCHAIN_FILE=$NDK_PATH/build/cmake/android.toolchain.cmake
-DCMAKE_BUILD_TYPE=Release
-DANDROID_PLATFORM=android-33
-DANDROID_ABI=arm64-v8a
```

CmakeLists中我是这么写的，具体情况看自己

```cmake
cmake_minimum_required(VERSION 3.25.2)
project(sys_security C)

set(CMAKE_C_STANDARD 99)

set(KP_DIR "../__KernelPatch_lib")
set(INCLUDE_DIRS . include patch/include linux/include linux/arch/arm64/include linux/tools/arch/arm64/include)

foreach(dir ${INCLUDE_DIRS})
    include_directories(${KP_DIR}/kernel/${dir})
endforeach()

set(OUTPUT_NAME "yuuki")

# 设置编译器和链接器
set(CMAKE_C_COMPILER /opt/android-ndk-r27/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android33-clang)

# 添加源文件
set(SOURCES mod_main.c)

# 添加库
add_library(${OUTPUT_NAME} SHARED ${SOURCES})



# 设置输出文件名
set_target_properties(${OUTPUT_NAME} PROPERTIES OUTPUT_NAME "${OUTPUT_NAME}")

# 重命名输出文件
add_custom_command(TARGET ${OUTPUT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E rename $<TARGET_FILE:${OUTPUT_NAME}> ${CMAKE_CURRENT_BINARY_DIR}/${OUTPUT_NAME}.kpm
)
```

接着构建一下cmake就行了

## 四.构建

构建需要在控制台使用**make**命令。清理则使用 **make clean**

你或许会问 为什么都使用cmake了，还要使用makefile构建呢

这里我也不太明白，我觉得我的cmake脚本写的没有问题，但是构建出来的elf文件和使用makefile构建出的完全不同，索性采用了这种方案

这种方案中，clion和cmake只是我们浏览代码和编写代码的工具，构建还是得使用makefile，这里有大佬明白的话恳请向我解答一下。

## 五.日志和模块加载

创建一个bat脚本，用于查看日志的输出，内容如下:

```shell
@echo off
adb_wsl shell "su -c 'dmesg -w | grep TAG'"
echo.
pause >nul
goto loop
```

加载模块:

```shell
adb shell -c 'kpatch $super_key kpm load \$KPM_PATH'
```

卸载模块:

```shell
adb shell -c 'kpatch $super_key kpm unload \$KPM_PATH'
```

这里面有许多的小坑，但都属于是题外话了，比如wsl2的安装，linux里用户和系统环境变量配置，adb在wsl2里的使用方式等等。但你想解决的话这些都不算大问题。
