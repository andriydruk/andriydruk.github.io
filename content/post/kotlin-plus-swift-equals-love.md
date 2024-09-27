+++
date = "2020-11-01T14:36:40+03:00"
description = ""
draft = false
title = "Swift + Kotlin = ❤️"
onmain = true
comments = true
+++

Last year, we at Readdle launched [Spark for Android](https://play.google.com/store/apps/details?id=com.readdle.spark&hl=ru). After just one year, the app has reached one million installs on Google Play. I believe this makes it the most popular Swift application currently available on Google Play.

I joined Readdle in 2016 and worked on the initial release of Spark for Android for three years. Readdle developed a specialized Swift toolchain to create the Android version, which was detailed in a [Medium article](https://blog.readdle.com/why-we-use-swift-for-android-db449feeacaf).

In this article, I want to describe the approach of integrating Swift and Kotlin code together.

<!--more-->

### Toolchain

The Swift compiler works very similarly to the [NDK clang compiler](https://android.googlesource.com/platform/ndk/+/master/docs/BuildSystemMaintainers.md#introduction) (they are both built on top of the LLVM project). With proper [silgen naming](https://github.com/apple/swift/blob/main/docs/StandardLibraryProgrammersManual.md#_silgen_name) conventions, it can compile Swift code into ABI-idiomatic C binary code. From the JVM's perspective, there is no difference between a dynamic library compiled from `.c` files and one compiled from `.swift` files. This makes it possible to write all native code for the Android platform using only the Swift language (including [JNI bridges](https://developer.android.com/training/articles/perf-jni)).

> The LLVM Project is a collection of modular and reusable compiler and toolchain technologies. This fork is used to manage Apple’s stable releases of Clang as well as to support the Swift project. [^1]

Kotlin code compiles into JVM bytecode, which is not so different from the bytecode that can be compiled from Java.

> Note: Because Android compiles Kotlin to ART-friendly bytecode in a similar manner as the Java programming language, you can apply the guidance on this page to both the Kotlin and Java programming languages in terms of JNI architecture and its associated costs. [^2]

From the standpoint of binding languages (Java <--> C or Kotlin <--> Swift), there is not much difference. At this point, the article could be concluded: Swift was successfully bound to Kotlin, goal achieved. But I want to go further.

My goal was not only to bind code written in these two languages but to make this binding automatic. A good acceptance criterion would be **the automatic generation of Kotlin headers and JNI bridges for all Swift modules that were added to the Android project**.

My proposal was to establish rules for binding specific Swift types to the appropriate Kotlin environment types. In the end, we categorized them into three groups:

* **References**
* **Values**
* **Protocols**

But before I describe each group, let’s first talk about memory management in both runtime environments.


### ARC and Tracing GC

On a regular basis, I interview experienced Android developers and ask them to describe how Traicing GC works and how it differs from Reference Counting. 
Then, I usually ask about a strong reference cycle. And this is the **moment**.

First, we should clarify what **RC** is.

> In [computer science](https://en.wikipedia.org/wiki/Computer_science), **reference counting** is a programming technique of storing the number of [references](https://en.wikipedia.org/wiki/Reference_(computer_science)), [pointers](https://en.wikipedia.org/wiki/Pointer_(computer_programming)), or [handles](https://en.wikipedia.org/wiki/Handle_(computing)) to a resource, such as an object, a block of memory, disk space, and others. In [garbage collection](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)) algorithms, reference counts may be used to deallocate objects that are no longer needed. [^3]

Ok, what about **ARC**?

> Automatic Reference Counting is a [memory management](https://en.m.wikipedia.org/wiki/Memory_management) feature of the [Clang](https://en.m.wikipedia.org/wiki/Clang) [compiler](https://en.m.wikipedia.org/wiki/Compiler) providing automatic [reference counting](https://en.m.wikipedia.org/wiki/Reference_counting) for the [Objective-C](https://en.m.wikipedia.org/wiki/Objective-C) and [Swift](https://en.m.wikipedia.org/wiki/Swift_(programming_language)) [programming languages](https://en.m.wikipedia.org/wiki/Programming_languages). At compile time, it inserts [retain](https://en.m.wikipedia.org/wiki/Object-oriented_programming#Dynamic_dispatch/message_passing) and `release` messages into the [object code](https://en.m.wikipedia.org/wiki/Object_code), which increase and decrease the reference count at runtime, marking for [deallocation](https://en.m.wikipedia.org/wiki/Deallocation) those [objects](https://en.m.wikipedia.org/wiki/Object_(computer_science)) when the number of references to them reaches zero. [^4]

Sounds good, but there are cases where ARC can’t handle memory management entirely automatically:

> However, it’s possible to write code in which an instance of a class *never* gets to a point where it has zero strong references. This can happen if two class instances hold a strong reference to each other, such that each instance keeps the other alive. This is known as a *strong reference cycle*. [^5]

There is a common approach to avoid issues like this, as [described by Apple](https://docs.swift.org/swift-book/LanguageGuide/AutomaticReferenceCounting.html#ID52).

**Tracing GC** works in a different way:

> In [computer programming](https://en.wikipedia.org/wiki/Computer_programming), **tracing garbage collection** is a form of [automatic memory management](https://en.wikipedia.org/wiki/Automatic_memory_management) that consists of determining which objects should be deallocated (“garbage collected”) by tracing which objects are *reachable* by a chain of references from certain “root” objects, and considering the rest as “garbage” and collecting them. Tracing garbage collection is the most common type of [garbage collection](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)) – so much so that “garbage collection” often refers to tracing garbage collection, rather than other methods such as [reference counting](https://en.wikipedia.org/wiki/Reference_counting) – and there are a large number of algorithms used in its implementation. [^6]

Ok, and what about cycles?
Cycles are handled by Tracing GC: all unreachable objects will be removed regardless of their cycle dependencies.

With this knowledge, we can move on to the first group: **References**.

## Reference

**Swift Reference** is any public [class](https://docs.swift.org/swift-book/LanguageGuide/ClassesAndStructures.html) that is imported into the Kotlin runtime environment. A Swift reference can be represented in the Kotlin environment as an instance of a Kotlin class that keeps a strong reference to the Swift instance.

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-1.gif" width="600" alt="Reference">
</div>

How can a Kotlin class keep a strong reference? Here, we should recall how reference counting (RC) works: to create a strong reference to a Swift class, you need to manually `retain` (+1 to counter) and store the memory reference in a Kotlin `long` field (for 64-bit architecture). Of course, every `retain` should be balanced by a `release` (-1 to counter).

And here’s the tricky part. Unfortunately, there are no deallocators in Tracing GC, at least not in the classic sense. Java and Kotlin classes have the [finalize](https://docs.oracle.com/javase/7/docs/api/java/lang/Object.html#finalize()) method, which is called when the GC destroys objects. However, it is not a recommended way to clean up resources. [^7]

There are two approaches for native memory deallocation in the Android Open Source Project:

1. **Manual releasing**: This approach is used in AOSP for [MediaPlayer](https://developer.android.com/reference/android/media/MediaPlayer#release()), [MediaRecorder](https://developer.android.com/reference/android/media/MediaRecorder#release()), and [MediaMuxer](https://developer.android.com/reference/android/media/MediaMuxer#release()).

2. **Automatic releasing**: In the AOSP project, this is used in `BigInteger`. Before Android 9, `BigInteger` used `finalize` for releasing native handles. However, in Android 9+, `BigInteger` uses the [NativeAllocationRegistry](https://android.googlesource.com/platform/libcore/+/refs/heads/master/luni/src/main/java/libcore/util/NativeAllocationRegistry.java). Unfortunately, this API is for internal use only.

<div class="alert alert-info">
  <strong>Note:</strong> If you are interested in this topic, I recommend the session <a href="https://www.youtube.com/watch?v=7_caITSjk1k">How to Manage Native C++ Memory in Android (Google I/O '17)</a>.
</div>

I believe that the most straightforward approach for now is **manual releasing of References** (this may change in the future).

Here are some code examples for both languages from the [Swift Weather](https://github.com/andriydruk/swift-weather-app) project:

**Swift Reference**

~~~swift
public class WeatherRepository {
    public init(delegate: WeatherRepositoryDelegate)
    public func loadSavedLocations()
    public func addLocationToSaved(location: Location)
    public func removeSavedLocation(location: Location)
    public func searchLocations(query: String?)
}
~~~

**Kotlin Reference**

~~~kotlin
class WeatherRepository private constructor() {
    companion object {
        external fun init(delegate: WeatherRepositoryDelegate): WeatherRepository
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

Static functions and variables can be accessed with static `external fun`s.

### Value

**Swift Values** are public structs that are imported into the Kotlin runtime environment. Unlike classes, structs cannot be passed as references; they always operate with copy-on-write behavior. Therefore, the only way to pass them to the Kotlin environment is by making a copy.
To work properly with the Swift API, copying should be supported in both directions: Swift -> Kotlin and Kotlin -> Swift.

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-2.gif" width="600" alt="Reference">
</div>

One possible implementation is using the [Codable](https://developer.apple.com/documentation/swift/codable) protocol for encoding/decoding into Kotlin data classes. This approach was implemented in the [JavaCoder](https://github.com/readdle/swift-java-coder) library, which can encode/decode Swift structs to Kotlin data classes with the appropriate field names. As a result, **Swift Values** work with copy-on-read behavior (similar to `C` structs).

The current implementation of [JavaCoder](https://github.com/readdle/swift-java-coder) supports the following types from the standard library:

- [Int](https://developer.apple.com/documentation/swift/int) -> [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/) (may overflow on 64-bit devices; use Int64 for larger numbers)
- [Int8](https://developer.apple.com/documentation/swift/int8) -> [Byte](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-byte/)
- [Int16](https://developer.apple.com/documentation/swift/int16) -> [Short](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-short/)
- [Int32](https://developer.apple.com/documentation/swift/int32) -> [Int](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-int/)
- [Int64](https://developer.apple.com/documentation/swift/int64) -> [Long](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-long/)
- [UInt](https://developer.apple.com/documentation/swift/uint) -> [UInt](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-int/)
- [UInt8](https://developer.apple.com/documentation/swift/uint8) -> [UByte](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-byte/)
- [UInt16](https://developer.apple.com/documentation/swift/uint16) -> [UShort](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-short/)
- [UInt32](https://developer.apple.com/documentation/swift/uint32) -> [UInt](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-int/)
- [UInt64](https://developer.apple.com/documentation/swift/uint64) -> [ULong](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-u-long/)
- [Float](https://developer.apple.com/documentation/swift/float) -> [Float](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-float/)
- [Double](https://developer.apple.com/documentation/swift/double) -> [Double](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-double/)
- [String](https://developer.apple.com/documentation/swift/string) -> [String](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-string/)
- [Data](https://developer.apple.com/documentation/foundation/data) -> [ByteBuffer](https://developer.android.com/reference/java/nio/ByteBuffer)
- [Date](https://developer.apple.com/documentation/foundation/date) -> [Date](https://developer.android.com/reference/java/util/Date)
- [URL](https://developer.apple.com/documentation/foundation/URL) -> [Uri](https://developer.android.com/reference/android/net/Uri)
- [Array](https://developer.apple.com/documentation/swift/array) -> [ArrayList](https://developer.android.com/reference/java/util/ArrayList)
- [Dictionary](https://developer.apple.com/documentation/swift/dictionary) -> [HashMap](https://developer.android.com/reference/java/util/HashMap)
- [Set](https://developer.apple.com/documentation/swift/set) -> [HashSet](https://developer.android.com/reference/java/util/HashSet)

A Swift Value can include another Swift Value as a field. Additionally, JavaCoder supports Enums and OptionSets.

Here are some code examples for both languages from the [Swift Weather](https://github.com/andriydruk/swift-weather-app) project:

**Swift Value:**

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

**Kotlin Value:**

~~~kotlin
data class Weather(
    val state: WeatherState,
    val date: Date,
    val minTemp: Float,
    val maxTemp: Float,
    val temp: Float,
    val windSpeed: Float,
    val windDirection: Float,
    val airPressure: Float,
    val humidity: Float,
    val visibility: Float,
    val predictability: Float
)
~~~

### Protocol

**Swift Protocol** refers to a protocol or a block that is imported into Kotlin's environment.

Protocols are used for passing Kotlin reference instances to the Swift runtime environment. Typically, this involves the implementation of Swift protocols or Swift blocks.

<div style="text-align:center" markdown="1">
    <img src="/img/kotlin-swift-animation-3.gif" width="600" alt="Reference">
</div>

In the Kotlin environment, it can be represented as an interface or a functional interface (`fun interface`). For such types, the we should generate a hidden Swift class that implements the corresponding protocol and creates a [JNI Global Reference](https://docs.oracle.com/javase/7/docs/technotes/guides/jni/spec/functions.html) for the Kotlin instance. Once the object's RC counter reaches zero, it deletes the JNI Global Reference and deinitializes.

A similar approach can be applied to Swift blocks.

**Swift Protocol:**

~~~swift
public protocol WeatherRepositoryDelegate {
    func onSearchSuggestionChanged(locations: [Location])
    func onSavedLocationChanged(locations: [Location])
    func onWeatherChanged(woeId: Int64, weather: Weather)
    func onError(errorDescription: String)
}
~~~

**Kotlin Protocol:**

~~~kotlin
interface WeatherRepositoryDelegate {
    fun onSearchSuggestionChanged(locations: ArrayList<Location>)
    fun onSavedLocationChanged(locations: ArrayList<Location>)
    fun onWeatherChanged(woeId: Long, weather: Weather)
    fun onError(errorDescription: String)
}
~~~

**Swift Block:**

~~~swift
public typealias SwiftBlock = (String) -> Void
~~~

**Kotlin Block:**

~~~kotlin
fun interface SwiftBlock {
    fun invoke(string: String)
}
~~~

### Summary

With these three concepts (Swift Reference, Swift Value, Swift Protocol), our bridging technology can cover almost any Swift library API. Of course, it doesn't support everything. For example, it doesn't support templates or structs without the Codable protocol. In such cases, I recommend writing a small wrapper layer to optimize your API for Android.

Another question I hear very often is: what about performance? Does JNI have an impact on the performance of the app? In most cases, no. JNI is quite fast. There are general recommendations from Google on [how to write code with JNI](https://developer.android.com/training/articles/perf-jni). All of these recommendations are applicable to Swift as well.

This is the roadmap for fully automated Kotlin-Swift binding:

1. **Create a tool to generate JNI code from Kotlin headers** ✅: Implemented with the [Annotation Processor](https://github.com/readdle/swift-java-codegen) (this is how Spark for Android works at the moment).
2. **Create a tool to generate Kotlin headers automatically** 🚧
3. **Merge both tools for better performance and consistency** 🎯

A few months ago, I started a small project to demonstrate using Swift on different platforms — [Swift Weather App](https://github.com/andriydruk/swift-weather-app). At this point, it is a fairly simple project, but I believe it's a great starting point for your journey into cross-platform Swift development.

[^1]: [The LLVM Compiler Infrastructure](https://llvm.org/)
[^2]: [Android developer: JNI tips](https://developer.android.com/training/articles/perf-jni)
[^3]: [Wikipedia: Reference Counting](https://en.wikipedia.org/wiki/Reference_counting)
[^4]: [Wikipedia: Automatic Reference Counting](https://en.wikipedia.org/wiki/Automatic_Reference_Counting#:~:text=Automatic%20Reference%20Counting%20(ARC)%20is,C%20and%20Swift%20programming%20languages)
[^5]: [Swift book: Strong Reference Cycles Between Class Instances](https://docs.swift.org/swift-book/LanguageGuide/AutomaticReferenceCounting.html#:~:text=However%2C%20it's%20possible%20to%20write,as%20a%20strong%20reference%20cycle.&text=class%20Person%20%7B,-let%20name%3A%20String)
[^6]: [Wikipedia: Tracing garbage collection](https://en.wikipedia.org/wiki/Tracing_garbage_collection)
[^7]: [Joshua Bloch: Effective Java Third Edition. Chapter 2: Creating and Destroying Objects](https://www.oreilly.com/library/view/effective-java/9780134686097/)







