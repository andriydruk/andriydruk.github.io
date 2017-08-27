+++
date = "2017-05-01T23:10:36+03:00"
title = "Introduction to C for Android Developers"
image = "/img/welcome_bg.jpg"
onmain = true

+++

### Introduction

Lately, I've spent a lot of time interviewing Android developers. And I was surprised how little amount of Android devs know C language. Most of the developers use only Java and convinced that C is too complex for their needs. But I will try to bust this myth - C code can be much simpler to write and much simpler to run.

### Toolchain

The first step is toolchain. For this tutorial, I will use a very basic set of the toolchain. I already have downloaded the [latest NDK](https://developer.android.com/ndk/downloads/index.html) (r14b) from the official website, added `ANDROID_NDK` environment variable, and I'm ready to create toolchain:

~~~bash
$ANDROID_NDK/build/tools/make_standalone_toolchain.py --arch arm --api 21 --unified-headers --install-dir ./toolchain
~~~

This command will generate toolchain for target platform 21 for ARM architecture.

<div class="alert alert-warning">
 <strong>Warning:</strong> The target API level in the NDK has a very different meaning than targetSdkVersion does in Java. The NDK target API level is your app's minimum supported API level.
</div>

<div class="alert alert-info">
  <strong>Note:</strong> All commands are written on macOS and can be also used for Linux. You can try to run this tutorial on your Windows machine with <a href="https://www.cygwin.com/">Cygwin</a> or modern <a href="https://msdn.microsoft.com/en-us/commandline/wsl/about">Windows bash</a>
</div>

### Hello world

If you are not familiar with C I highly recommend starting from ["The C Programming Language"](https://www.amazon.com/Programming-Language-Brian-W-Kernighan/dp/0131103628) book by Kernighan and Ritchie (also known as K&R C). It's very basic but still very useful in our time. As usual, I will start from Hello world. Here's an example from this book (slightly modified for modern OS):

~~~c
#include <stdio.h>

int main() {
    printf("hello, world");
    return 0;
}
~~~

Ok, next step building and running as a command line application on Android device.

I use clang compiler (this is a default compiler in NDK 14). Clang is a frontend compiler for different languages including C and C++ that uses LLVM as backend. And a small step into a theory of compilation. In C there are 4 stages of compilation:

1. Preprocessing
2. Actual compilation
3. Assembly
4. Linking

<div class="alert alert-info">
  <strong>Note:</strong> In compilers 'frontend' means that compiler performs preprocessing of a source file, parsing code to AST and generates intermediate code (it's stage 1 and 2). Then 'backend' optimizes this code and translates it to machine code for specific CPU architecture (stage 3) (objects file). Then a linker performs linking of executables or libraries from objects.
</div>

Back to practice, this command compiles .c file to object and then links it to the executable file for toolchain platform:

~~~bash
/toolchain/bin/clang helloworld.c -o main
~~~

If you are running on API 21 or higher you need to set a flag for position independent executables.

> Starting from Android 4.1 (API level 16), Android's dynamic linker supports position-independent executables (PIE). From Android 5.0 (API level 21), executables require PIE. To use PIE to build your executables, set the `-fPIE flag`. This flag makes it harder to exploit memory corruption bugs by randomizing code location. <sup>[1](https://developer.android.com/ndk/guides/application_mk.html#var)</sup>

~~~bash
./toolchain/bin/clang helloworld.o -o main -fPIE -pie
~~~

For running helloworld executable you need Android Device or Emulator. Copy executable and run it via `adb`:

~~~bash
adb push ./main /data/local/tmp/
adb shell /data/local/tmp/main
hello, world%
~~~

Congratulations 🎉, you've just run your first C command line application for Android. This approach is great for testing some features in C without needing to create an android app, compile Java, package .apk file, etc. Just copy binary and run - very simple.

### Libraries

There are 2 types of libraries in C:

- static
- dynamic

In this section, I will create an executable linked against libraries of both types. As an example application, I decide to create a small utility that compares results of two implementations of inverse square root: system math library and hack that [was used in Quake III](https://en.wikipedia.org/wiki/Fast_inverse_square_root#Overview_of_the_code). In the static library, I've implemented Quake III version of an inverse square root, in dynamic -  `math.h` version. And this executable will ask a user for an input and print both results.

Let's start with the **static library**. Again, a small step in theory:

> Static libraries are simply a collection of ordinary object files. This collection is created using the ar (archiver) program. Static libraries permit users to link to programs without having to recompile its code, saving recompilation time. Static libraries are often useful for developers if they wish to permit programmers to link to their library, but don't want to give the library source code. <sup>[2](http://tldp.org/HOWTO/Program-Library-HOWTO/static-libraries.html)</sup>

~~~c
#include <stdio.h>

float Q_rsqrt( float number )
{
	long i;
	float x2, y;
	const float threehalfs = 1.5F;

	x2 = number * 0.5F;
	y  = number;
	i  = * ( long * ) &y;                     // evil floating point bit level hacking
	i  = 0x5f3759df - ( i >> 1 );             // what the fuck?
	y  = * ( float * ) &i;
	y  = y * ( threehalfs - ( x2 * y * y ) ); // 1st iteration
//	y  = y * ( threehalfs - ( x2 * y * y ) ); // 2nd iteration, this can be removed

	return y;
}
~~~

Compile this hacky .c file into object

~~~bash
./toolchain/bin/clang fast-inverse-square-root.c -c
~~~

This command will compile .c file into .o file (object). It's an intermediate object that will be used for creation of a static library. For deeper understanding what objects are we will use `nm` utility:

> The `nm` command can report the list of symbols in a given library. It works on both static and shared libraries. For a given library nm can list the symbol names defined, each symbol's value, and the symbol's type. It can also identify where the symbol was defined in the source code (by filename and line number), if that information is available in the library (see the `-l` option). The symbol type is displayed as a letter; lowercase means that the symbol is local, while uppercase means that the symbol is global (external). <sup>[3](http://tldp.org/HOWTO/Program-Library-HOWTO/miscellaneous.html)</sup>

Typical symbol types include:

- T (a normal definition in the code section)
- D (initialized data section)
- B (uninitialized data section)
- U (undefined; the symbol is used by the library but not defined by the library)
- W (weak; if another library also defines this symbol, that definition overrides this one). 

We will check all our artifacts (objects, libraries, executables) with `nm` utility. Let's check fast-inverse-square-root.o:

~~~bash
./toolchain/bin/arm-linux-androideabi-nm fast-inverse-square-root.o
00000000 T Q_rsqrt
~~~

As mentioned above `T` means definition of symbol (in our case method) inside library. Next step archive object file to .a file

> The gnu ar program creates, modifies, and extracts from archives. An archive is a single file holding a collection of other files in a structure that makes it possible to retrieve the original individual files (called members of the archive). <sup>[4](https://sourceware.org/binutils/docs/binutils/ar.html)</sup>

~~~bash
./toolchain/bin/arm-linux-androideabi-ar rcs libstatic.a fast-inverse-square-root.o
~~~

You should get a libstatic.a file. You can check a list of symbols in archive the same way we do it for .o files.

**Shared library** is more difficult, let's start from definition:

> Shared libraries are libraries that are loaded by programs when they start. When a shared library is installed properly, all programs that start afterwards automatically use the new shared library. It's actually much more flexible and sophisticated than this, because the approach used by Linux permits you to: update libraries and still support programs that want to use older, non-backward-compatible versions of those libraries; override specific libraries or even specific functions in a library when executing a particular program; do all this while programs are running using existing libraries. <sup>[5](http://tldp.org/HOWTO/Program-Library-HOWTO/shared-libraries.html)</sup>

Since Android API 23 NDK supports dylib `SONAME`. 

> Every shared library has a special name called the `soname`. The soname has the prefix `lib`, the name of the library, the phrase .so, followed by a period and a version number that is incremented whenever the interface changes (as a special exception, the lowest-level C libraries don't start with `lib`). A fully-qualified soname includes as a prefix the directory it's in; on a working system a fully-qualified soname is simply a symbolic link to the shared library's `realname`. Every shared library also has a `realname`, which is the filename containing the actual library code. The real name adds to the soname a period, a minor number, another period, and the release number. The last period and release number are optional. The minor number and release number support configuration control by letting you know exactly what version(s) of the library are installed. <sup>[6](http://tldp.org/HOWTO/Program-Library-HOWTO/shared-libraries.html)</sup>

There is a "small" problem with soname in Android: all Android 23+ platforms require `soname`, but only Android 23+ can read it. That's why if you current min API lower than 23 you should always set `soname` == `realname`. No versioning of soname yet 😔

Code of inverse square root using math.h:

~~~c
#include <stdio.h>
#include <math.h>

float rsqrt( float number )
{
	return  1 / sqrtf(number);
}
~~~

Let's build shared library:

~~~bash
./toolchain/bin/clang -shared -o libdynamic.so -Xlinker -soname=libdynamic.so standart-inverse-square-root.c
~~~

You should get libdynamic.so. Let's check it with nm:

~~~bash
../toolchain/bin/arm-linux-androideabi-nm -D libdynamic.so
0000144c A __bss_start
         U __cxa_atexit
         U __cxa_finalize
0000144c A _edata
0000144c A _end
000002f0 T rsqrt
         U sqrtf
~~~

There are 2 interesting rows: 

- T rsqrt - it's method defined in this library
- U sqrtf - system sqrtf defined in math.h

Now check the header of the shared library. For this purpose, we can use readelf utility.

> `readelf` displays information about one or more ELF format object files. <sup>[7](https://sourceware.org/binutils/docs/binutils/readelf.html)</sup>

The biggest advantages of using ELF - it's independence from CPU, ABI or operation system and can be used anywhere for checking any ELF object. If you have gcc tools preinstalled you can use sysytem `readelf`. For macOS user I can recommend `brew install greadelf`

~~~bash
greadelf -d libdynamic.so | grep -E 'NEEDED|SONAME'

 0x00000001 (NEEDED)                     Shared library: [libdl.so]
 0x00000001 (NEEDED)                     Shared library: [libc.so]
 0x0000000e (SONAME)                     Library soname: [libdynamic.so]
~~~

As you can see in libdynamic.so header contains `soname` identical to filename and has 2 dependencies to system libs: libdl and libc. But also we need to link math library here, because of unresolved `sqrtf` symbol. To do it just add `-lm` flag

~~~bash
./toolchain/bin/clang -shared -o libdynamic.so -Xlinker -soname=libdynamic.so -lm standart-inverse-square-root.c
greadelf -d libdynamic.so | grep -E 'NEEDED|SONAME'
 0x00000001 (NEEDED)                     Shared library: [libm.so]
 0x00000001 (NEEDED)                     Shared library: [libdl.so]
 0x00000001 (NEEDED)                     Shared library: [libc.so]
 0x0000000e (SONAME)                     Library soname: [libdynamic.so]
~~~

Next step is building of an **executable** (helloworld.h):

~~~c
#include <stdio.h>

float Q_rsqrt( float number );
float rsqrt( float number );

int main() {
	int c;
	scanf("%d", &c);
	printf("Quick inverse square root of %d is %f\n", c, Q_rsqrt(c));
	printf("Standard inverse square root of %d is %f\n", c, rsqrt(c));
	return 0;
}
~~~

First, try to compile helloworld.c:

~~~bash
./toolchain/bin/clang -o helloworld helloworld.c
helloworld.c:function main: error: undefined reference to 'Q_rsqrt'
helloworld.c:function main: error: undefined reference to 'rsqrt'
clang38: error: linker command failed with exit code 1 (use -v to see invocation)
~~~

Linker said that there are no `Q_rsqrt` and `rsqrt`. Try to link against libraries:

~~~bash
./toolchain/bin/clang -L./ -o helloworld helloworld.c libstatic.a libdynamic.so -fPIE -pie
~~~

Time to run this on the device. Besides running executable command line application needed to specify `LD_LIBRARY_PATH` (the path where executable should look for dynamic libraries):

~~~bash
adb push ./libdynamic.so /data/local/tmp
adb push ./helloworld /data/local/tmp
adb shell LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/helloexecutable

42
Quick inverse square root of 42 is 0.154036
Standard inverse square root of 42 is 0.154303
~~~

### Cross-platform compilation and CMake

C is a cross-platform language and in general case C code can be compiled for any platform. Headers that I imported in my sample project refers to libc, it's the standard library for the C programming language, as specified in the ANSI C standard. In this section, I will show how to build the sample app for host system (in my case macOS) and Android. For this purpose I use CMake:

> CMake is an open-source, cross-platform family of tools designed to build, test and package software. CMake is used to control the software compilation process using simple platform and compiler independent configuration files, and generate native makefiles and workspaces that can be used in the compiler environment of your choice. <sup>[8](https://cmake.org/)</sup>

Android SDK nowadays contains his own version of CMake, we will use it.

All rules of compilation usually describe in CMakeList.txt. You can check syntaxis of [CMake config here](https://cmake.org/cmake-tutorial/).
My version of CMakeList.txt for fast inverse square root sample is:

~~~cmake
cmake_minimum_required(VERSION 3.6) # set min version of cmake

project(helloworld) # create project

include_directories ("${PROJECT_SOURCE_DIR}/static-library") # include dir of static lib
include_directories ("${PROJECT_SOURCE_DIR}/dynamic-library") # include dir of shared lib

add_library(sisr SHARED 
 ${PROJECT_SOURCE_DIR}/dynamic-library/standart-inverse-square-root.c) # create shared lib
add_library(fisr STATIC 
 ${PROJECT_SOURCE_DIR}/static-library/fast-inverse-square-root.c) # create static lib

SET( CMAKE_EXE_LINKER_FLAGS  "${CMAKE_EXE_LINKER_FLAGS} -fPIE -pie") # set PIE
add_executable(helloworld helloworld.c) # create executable
target_link_libraries (helloworld fisr) # link static lib
target_link_libraries (helloworld sisr) # link shared lib
~~~

CMake building consists of 2 steps: generate makefiles for target platform and run build

Compile the project for mac:

~~~bash
cmake . -Bbuild-mac # -B specify a folder for generated scripts
cd build-mac
cmake --build .
./helloworld
~~~

For Android we need to pass android.toolchain.cmake file with parameters for CMake.
And for Android scripts will look like:

~~~bash
cmake -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake . -Bbuild-android
cd build-android
cmake --build .
adb push ./libsisr.so /data/local/tmp
adb push ./helloworld /data/local/tmp
adb shell LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/helloworld
42
Quick inverse square root of 42 is 0.154036
Standard inverse square root of 42 is 0.154303
~~~

As you can see CMake is a very simple tool for building cross-platform C code.

<div class="alert alert-info">
  <strong>Note:</strong> Android CMake configuration provides <a href="https://developer.android.com/ndk/guides/cmake.html">special flags</a> for Android such as minApi, stl, toolchain, etc.
</div>

Now you can try something more complicated with one of the IDE that supports CMake build system (e.g. [JetBrains CLion](https://www.jetbrains.com/clion/)).

### What's next? 

According to official documentation, Google recommends to use NDK for 2 reasons:

- Squeeze extra performance out of a device to achieve low latency or run computationally intensive applications, such as games or physics simulations.
- Reuse your own or other developers' C or C++ libraries.

From my point of view, C can be used for any particular code in your project except UI part and communication with a system. Also, it can be useful in the cross-platform development of shared codebase.

I hope my tutorial persuaded you to stop being afraid of C code and inspired to write something on your own. My sample of cross-platform compilation is [available on Github](https://github.com/andriydruk/intoduction-to-c-for-android-developers).
