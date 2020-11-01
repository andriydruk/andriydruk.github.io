+++
date = "2020-11-01T14:36:40+03:00"
description = ""
draft = false
title = "Swift + Kotlin = ❤️"
onmain = false
comments = true
+++

Last year we at Readdle launched [Spark for Android](https://play.google.com/store/apps/details?id=com.readdle.spark&hl=ru). After 1 year there are one million installs on Google Play. I believe this is the biggest Swift application in Google Play for now. 

I'm joined Readdle in 2016 and worked 3 years on the first release of Spark for Android. For creating Android version Readdle developed a special Swift toolchain that was already described in [article on Medium](https://blog.readdle.com/why-we-use-swift-for-android-db449feeacaf).

In this article, I will describe the approach of binding Swift and Kotlin code in one.

<!--more-->

### Toolchain

For compiling Swift code is using [Apple fork of LLVM](https://github.com/apple/llvm-project). 

> The LLVM Project is a collection of modular and reusable compiler and toolchain technologies. This fork is used to manage Apple’s stable releases of Clang as well as support the Swift project. [^1]

It works very similar to the [NDK clang compiler](https://android.googlesource.com/platform/ndk/+/master/docs/BuildSystemMaintainers.md#introduction) and with proper [silgen naming](https://github.com/apple/swift/blob/main/docs/StandardLibraryProgrammersManual.md#_silgen_name) convention, it can compile Swift to ABI idiomatic C binary code. From the perspective of the JVM view, there is no difference in a dynamic library that was compiled from .c files or from .swift files. That's why it is possible to write all native code for the Android platform using only Swift language (including [JNI bridges](https://developer.android.com/training/articles/perf-jni).)

Kotlin code compiles in JVM byte code, that's no so different from byte code that can be compiled from Java. 

> Note: Because Android compiles Kotlin to ART-friendly bytecode in a similar manner as the Java programming language, you can apply the guidance on this page to both the Kotlin and Java programming languages in terms of JNI architecture and its associated costs. [^2]

From the standpoint of binding to languages Java <--> C or Kotlin <--> Swift there not much difference. At this point, the article can be finished. Swift with Kotlin was bound, goal achieved. But I wanna go further.

My goal not only bind code written in these two languages but make this binding automatic. Good acceptance criteria can be **automatic generation of Kotlin headers and JNI bridges for all Swift modules that were added to the Android project**.

To achieve this goal needed rules for understanding if the concrete type can be bound to Kotlin's environment and how this type would be represented here. Let's separate all types into 3 big groups:

* **References**
* **Values**
* **Protocols**

But before I'm going to describe every group, let’s talk about memory management in both runtime environments.

### ARC and Tracing GC

On a regular basis, I'm interviewing experienced Android developers and I ask to describe how ART GC works and how it differs from Reference Count. Spoiler: most interviewers saying that it the same things 😀

Then I usually ask about a strong reference cycle. And this is a **moment**.

First, we should clarify what is **RC**?

> In  [computer science](https://en.wikipedia.org/wiki/Computer_science) , **reference counting** is a programming technique of storing the number of  [references](https://en.wikipedia.org/wiki/Reference_(computer_science)) ,  [pointers](https://en.wikipedia.org/wiki/Pointer_(computer_programming)) , or  [handles](https://en.wikipedia.org/wiki/Handle_(computing))  to a resource, such as an object, a block of memory, disk space, and others. In  [garbage collection](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science))  algorithms, reference counts may be used to deallocate objects which are no longer needed. [^3]

Ok, what about **A**? 

> Automatic Reference Count is  [memory management](https://en.m.wikipedia.org/wiki/Memory_management)  feature of the  [Clang](https://en.m.wikipedia.org/wiki/Clang)   [compiler](https://en.m.wikipedia.org/wiki/Compiler)  providing automatic  [reference counting](https://en.m.wikipedia.org/wiki/Reference_counting)  for the  [Objective-C](https://en.m.wikipedia.org/wiki/Objective-C)  and  [Swift](https://en.m.wikipedia.org/wiki/Swift_(programming_language))   [programming languages](https://en.m.wikipedia.org/wiki/Programming_languages) . At compile time, it inserts into the  [object code](https://en.m.wikipedia.org/wiki/Object_code)   [messages](https://en.m.wikipedia.org/wiki/Object-oriented_programming#Dynamic_dispatch/message_passing)  retain and release which increase and decrease the reference count at run time, marking for  [deallocation](https://en.m.wikipedia.org/wiki/Deallocation)  those  [objects](https://en.m.wikipedia.org/wiki/Object_(computer_science))  when the number of references to them reaches zero. [^4]  

Sounds good, but there are cases where ARC can’t handle memory totally automatically:

> However, it’s possible to write code in which an instance of a class *never* gets to a point where it has zero strong references. This can happen if two class instances hold a strong reference to each other, such that each instance keeps the other alive. This is known as a *strong reference cycle*. [^5]

There is a common approach on how to avoid issues like this [described by Apple](https://docs.swift.org/swift-book/LanguageGuide/AutomaticReferenceCounting.html#ID52).

**Tracing GC** work in another way

> In  [computer programming](https://en.wikipedia.org/wiki/Computer_programming) , **tracing garbage collection** is a form of  [automatic memory management](https://en.wikipedia.org/wiki/Automatic_memory_management)  that consists of determining which objects should be deallocated (“garbage collected”) by tracing which objects are *reachable* by a chain of references from certain “root” objects, and considering the rest as “garbage” and collecting them. Tracing garbage collection is the most common type of  [garbage collection](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science))  – so much so that “garbage collection” often refers to tracing garbage collection, rather than other methods such as  [reference counting](https://en.wikipedia.org/wiki/Reference_counting)  – and there are a large number of algorithms used in implementation. [^6]

Ok, and what about cycles?
Cycles destroyed by Tracing GC: all unreachable objects will be removed despite the fact of their cycle dependencies.

Next: first type - References.

## Reference

**Swift Reference** is any public [class](https://docs.swift.org/swift-book/LanguageGuide/ClassesAndStructures.html) that imported to Kotlin runtime environment. Swift reference can be represented in Kotlin's environment as an instance of Kotlin class that keeps a strong reference to Swift instance. 

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-1.gif" width="600" alt="Reference">
</div>

How actually Kotlin class can keep a strong reference? Here we should remember how RC works: to create a strong reference to Swift class do manual retain (+1 to counter) and store memory reference in Kotlin long field (for 64-bit architecture). Of cause every retain should be balanced by release (-1 to counter). 

And it's a tricky part. Unfortunately, there are no deallocators in Tracing GC at least in classic meaning. Java and Kotlin classes have [finalize](https://docs.oracle.com/javase/7/docs/api/java/lang/Object.html#finalize()) method that called when GC destroy objects. But it is not a recommended way of cleaning resources [^7].

There are 2 approaches to deallocating native memory in Android Open Source Project:

1. Manual releasing: in AOSP project it used in [MediaPlayer](https://developer.android.com/reference/android/media/MediaPlayer#release()), [MediaRecorder](https://developer.android.com/reference/android/media/MediaRecorder#release()) and [MediaMuxer](https://developer.android.com/reference/android/media/MediaMuxer#release()). 

2. Automatic releasing: in the AOSP project is used in BigInteger. Before Android 9 it uses finalize. But in Android 9+ BigInteger releasing native handles used [NativeAllocationRegistry](https://android.googlesource.com/platform/libcore/+/refs/heads/master/luni/src/main/java/libcore/util/NativeAllocationRegistry.java). Unfortunately this API is for internal use only

<div class="alert alert-info">
  <strong>Note:</strong> if you are intrested in this topic, I would recommend session <a href="https://www.youtube.com/watch?v=7_caITSjk1k">How to Manage Native C++ Memory in Android (Google I/O '17)</a>.
</div>

I believe that the most straight forward way, for now, is **manual releasing of References** (in future this can be changed).

Here examples of code for both languages from [Swift Weather](https://github.com/andriydruk/swift-weather-app) project:

Swift Reference
~~~swift
public class WeatherRepository {
    public init(delegate: WeatherRepositoryDelegate)
    public func loadSavedLocations()
    public func addLocationToSaved(location: Location)
    public func removeSavedLocation(location: Location)
    public func searchLocations(query: String?)
}
~~~

Kotlin Reference
~~~kotlin
class WeatherRepository private constructor() {
    companion object {
        external fun init(delegate: Delegate): WeatherRepository
    }
    // Swift JNI private native pointer
    private val nativePointer = 0L
    external fun loadSavedLocations()
    external fun addLocationToSaved(location: Location)
    external fun removeSavedLocation(location: Location)
    external fun searchLocations(query: String?)
    // Swift JNI release method
    external fun release()
}
~~~

Static functions and variables could be accessed with static external funs.

### Value

**Swift Values** is any public struct that imported to the Kotlin runtime environment. Unlike classes, struct can't be passed as references, it always works with copy-on-write behavour. That's why the only way to pass it to Kotlin environment - make a copy.
For proper working with Swift API copying should work in both sides Swift -> Kotlin and Kotlin -> Swift.

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-2.gif" width="600" alt="Reference">
</div>

One possible implementation is using [Codable](https://developer.apple.com/documentation/swift/codable) protocol for encoding/decoding in Kotlin data class. This approach was implemented in [JavaCoder](https://github.com/readdle/swift-java-coder) that can encode/decode Swift structs to Kotlin data classes with appropriate field names. As result, **Swift Values** works with copy-on-read behavour (similar to `C` struct).

The current implementation of [Java Coder](https://github.com/readdle/swift-java-coder) supports that kind of types from the standard library:

* [Int](https://developer.apple.com/documentation/swift/int) -> [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/) (could be overflow on 64-bit devices, use Int64 for big numbers)
* [Int8](https://developer.apple.com/documentation/swift/int8) -> [Byte](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-byte/)
* [Int16](https://developer.apple.com/documentation/swift/int16) -> [Short](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-short/)
* [Int32](https://developer.apple.com/documentation/swift/int32) -> [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/)
* [Int64](https://developer.apple.com/documentation/swift/int64) -> [Long](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-long/)
* [UInt](https://developer.apple.com/documentation/swift/uint) -> @Unsigned [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/) (probably will be changed to Kotlin [UInt](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-int/))
* [UInt8](https://developer.apple.com/documentation/swift/uint8) -> @Unsigned [Byte](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-byte/)
* [UInt16](https://developer.apple.com/documentation/swift/uint16) -> @Unsigned [Short](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-short/)
* [UInt32](https://developer.apple.com/documentation/swift/uint32) -> @Unsigned [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/)
* [UInt64](https://developer.apple.com/documentation/swift/uint64) -> @Unsigned [Long](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-long/)
* [Float](https://developer.apple.com/documentation/swift/float) -> [Float](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-float/)
* [Double](https://developer.apple.com/documentation/swift/double) -> [Double](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-double/)
* [String](https://developer.apple.com/documentation/swift/string) -> [String](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-string/)
* [Data](https://developer.apple.com/documentation/foundation/data) -> [ByteBuffer](https://developer.android.com/reference/java/nio/ByteBuffer)
* [Date](https://developer.apple.com/documentation/foundation/date) -> [Date](https://developer.android.com/reference/java/util/Date)
* [URL](https://developer.apple.com/documentation/foundation/URL) -> [Uri](https://developer.android.com/reference/android/net/Uri)
* [Array](https://developer.apple.com/documentation/swift/array) -> [ArrayList](https://developer.android.com/reference/java/util/ArrayList)
* [Dictionary](https://developer.apple.com/documentation/swift/dictionary) -> [HashMap](https://developer.android.com/reference/java/util/HashMap)
* [Set](https://developer.apple.com/documentation/swift/set) -> [HashSet](https://developer.android.com/reference/java/util/HashSet)

Swift Value can include another Swift Value as field. Also Java Coder supports Enums and OptionSets.

Here examples of code for both languages from [Swift Weather](https://github.com/andriydruk/swift-weather-app) project:

Swift Value:
~~~swift
public struct Weather: Codable, Hashable {
    public let state: WeatherState
    public let date: Date
    public let minTemp: Float
    public let maxTemp: Float
    public let temp: Float
    public let windSpeed: Float
    public let windDirection: Float
    public let airPressure: Float
    public let humidity: Float
    public let visibility: Float
    public let predictability: Float
}
~~~

Kotlin Value:
~~~kotlin
data class Weather(
    val state: WeatherState = WeatherState.NONE,
    val date: Date = Date(),
    val minTemp: Float = Float.NaN,
    val maxTemp: Float = Float.NaN,
    val temp: Float = Float.NaN,
    val windSpeed: Float = Float.NaN,
    val windDirection: Float = Float.NaN,
    val airPressure: Float = Float.NaN,
    val humidity: Float = Float.NaN,
    val visibility: Float = Float.NaN,
    val predictability: Float = Float.NaN
)
~~~

### Protocol

**Swift Protocol** is a protocol or block that imported to Kotlin's environment.

Protocols are used for passing Kotlin reference instances to the Swift runtime environment. Usually, this is the implementation of Swift protocols or Swift blocks. 

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-3.gif" width="600" alt="Reference">
</div>

In Kotlin's environment, it can be represented as an interface or fun interface. For such types, the toolchain should generate a hidden Swift class, that implements the appropriate protocol and create a [JNI Global References](https://docs.oracle.com/javase/7/docs/technotes/guides/jni/spec/functions.html) for Kotlin's instance. After this object’s RC counter reach zero it delete JNI Global Reference and deinit.

A similar approach can be applied for the Swift block.

Swift Protocol:
~~~swift
public protocol WeatherRepositoryDelegate {
    func onSearchSuggestionChanged(locations: [Location])
    func onSavedLocationChanged(locations: [Location])
    func onWeatherChanged(woeId: Int64, weather: Weather)
    func onError(errorDescription: String)
}
~~~

Kotlin Protocol:
~~~kotlin
interface WeatherRepositoryDelegate {
    fun onSearchSuggestionChanged(locations: ArrayList<Location>)
    fun onSavedLocationChanged(locations: ArrayList<Location>)
    fun onWeatherChanged(woeId: Long, weather: Weather)
    fun onError(errorDescription: String)
}
~~~

Swift Block:
~~~swift
public typealias SwiftBlock = (String) -> Void
~~~

Kotlin Block:
~~~kotlin
@SwiftBlock("(String)->Void")
fun interface SwiftBlock {
    fun invoke(string: String)
}
~~~

### Summary

With this 3 concept toolchain can covert almost any Swift library API. Of cause, it can’t support all. For example, it doesn't support templates or struct without a Codable protocol. In this case, I would recommend writing a small wrapper layer that will optimize your API for Android.

Another question I heard very often: what about performance? Does JNI have an impact on the performance of the app? In most cases no, JNI is pretty fast. There are general recommendations from Google [how to write code with JNI](https://developer.android.com/training/articles/perf-jni). All these recommendations appliable for Swift as well.

This is roadmap for fully automated Kotlin-Swift binding: 

1. Create a tool for generating JNI code from Kotlin headers ✅: was implemented with [Annotation Processor](https://github.com/readdle/swift-java-codegen) (this how Spark for Android now works)
2. Create a tool for generating Kotlin header automatically 🚧
3. Merge both tools for better performance and consistency 🎯

A few months ago, I started a small project for the demonstration of using Swift lang in different platforms - [Swift Weather App](https://github.com/andriydruk/swift-weather-app). At the current point in time, this is a pretty simple project but I believe, it's a very good point to start your journey to Swift cross-platform development.

[^1]: [The LLVM Compiler Infrastructure](https://llvm.org/)
[^2]: [Android developer: JNI tips](https://developer.android.com/training/articles/perf-jni)
[^3]: [Wikipedia: Reference Counting](https://en.wikipedia.org/wiki/Reference_counting)
[^4]: [Wikipedia: Automatic Reference Counting](https://en.wikipedia.org/wiki/Automatic_Reference_Counting#:~:text=Automatic%20Reference%20Counting%20(ARC)%20is,C%20and%20Swift%20programming%20languages)
[^5]: [Swift book: Strong Reference Cycles Between Class Instances](https://docs.swift.org/swift-book/LanguageGuide/AutomaticReferenceCounting.html#:~:text=However%2C%20it's%20possible%20to%20write,as%20a%20strong%20reference%20cycle.&text=class%20Person%20%7B,-let%20name%3A%20String)
[^6]: [Wikipedia: Tracing garbage collection](https://en.wikipedia.org/wiki/Tracing_garbage_collection)
[^7]: [Joshua Bloch: Effective Java Third Edition. Chapter 2: Creating and Destroying Objects](https://www.oreilly.com/library/view/effective-java/9780134686097/)







