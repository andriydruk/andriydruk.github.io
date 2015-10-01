+++
categories = ["Development"]
date = "2015-08-04T22:40:49+03:00"
description = ""
draft = false
image = "/img/material-002.jpg"
tags = ["tools", "androiddev"]
title = "Деобфускация трассировок стека"

+++

Одной из самых плохо описанных областей в Android разработке есть руководства по использованию инструментов разработчика. Поэтому я решил описать их в серии небольших статей. В этой статья я хочу рассказать о том какие инструменты предоставляет SDK для работы с трассировками стеков (stacktraces), полученых из выпущенных сборок.  
<!--more-->
Одной из проблем поддержки выпущенных Android приложений является деобфускация или retrace трассировок стеков полученнных из обфусцированных сборок. Для того чтобы разобраться в том как деобфусцировать трассировки стеков, нужно понять как работает обфускация. Стандратным способом обфускации в Android есть использования такого инструмента как ProGuard. Вот что о нем говорит [официальная документация](http://developer.android.com/tools/help/proguard.html#decoding)

> The ProGuard tool shrinks, optimizes, and obfuscates your code by removing unused code and renaming classes, fields, and methods with semantically obscure names. 

Ну чтож звучит неплохо, попробуем на практике. Начнем с самого простого: создадим новый проект с помощью Android Studio и включим обфускацию для отладочных сборок:

~~~gradle
buildTypes {
    debug {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
~~~
    
Выкинем новое исключение в методе onCreate класса MainActivity
   
~~~java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    throw new RuntimeException("Stack deobfuscation example exception");
}
~~~
    
После запуска получим трассировку стека похожую на следующую

~~~java    
Caused by: java.lang.RuntimeException: Stack deobfuscation example exception
    at com.druk.myapplication.MainActivity.onCreate(Unknown Source)
    at android.app.Activity.performCreate(Activity.java:6162)
    at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:2370)
    at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:2477)
    at android.app.ActivityThread.-wrap11(ActivityThread.java)
    at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1345)
    at android.os.Handler.dispatchMessage(Handler.java:102)
    at android.os.Looper.loop(Looper.java:148)
    at android.app.ActivityThread.main(ActivityThread.java:5415)
    at java.lang.reflect.Method.invoke(Native Method)
    at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:725)
    at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:615)
~~~

Почему же после обфускации MainActivity осталась MainActivity? Дело в том что помимо конфигурационого файла proguard-rules.pro в нашем каталоге (который в сгенерированном примере долежен быть пустым), ProGuard использует стандратные правила обфускации Android проектов из SDK, которые и ослабляют обфускацию наследников Activity. В документации Proguard можно найти следующие правила для Android проектов:

~~~java
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
~~~

Тоесть по умолчанию ProGuard оставляет все имена классов, которые являются наследниками android.app.Activity. Продолжим наш эксперемент: создадим внутренни статический класс, который поможет нам вызвать аварийную ситуацию в нашем приложении

~~~java
private static class CrashHelper{

    public static void crash(){
        throw new RuntimeException("Stack deobfuscation example exception");
    }
}
~~~
     
Вызвав статический метод crash в onCreate мы получим следующую трассировку стека:

~~~java 
Caused by: java.lang.RuntimeException: Stack deobfuscation example exception
     at com.druk.myapplication.a.b(Unknown Source)
     at com.druk.myapplication.a.a(Unknown Source)
     at com.druk.myapplication.MainActivity.onCreate(Unknown Source)
     at android.app.Activity.performCreate(Activity.java:6162)
     at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
     at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:2370)
     at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:2477)
     at android.app.ActivityThread.-wrap11(ActivityThread.java)
     at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1345)
     at android.os.Handler.dispatchMessage(Handler.java:102)
     at android.os.Looper.loop(Looper.java:148)
     at android.app.ActivityThread.main(ActivityThread.java:5415)
     at java.lang.reflect.Method.invoke(Native Method)
     at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:725)
     at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:615)
~~~

Похоже это то что мы хотели получить. У некоторого мифического класса 'а' был вызван метод 'a', в теле которого был вызван метод 'b'.

Для деобфускации нам нужен файл mapping.txt из нашего build каталога. В моем случае путь к файлу app/build/outputs/mapping/debug/mapping.txt. Далее необходимо воспользоваться либо скриптом retrace.sh из ANDROID_HOME/tools/proguard/bin, либо воспользоваться GUI утилитой ProguadGUI из ANDROID_HOME/tools/proguard/lib/proguardgui.jar. Воспользовавшись GUI утилитой мы получим следующую трассировку стека:

![Alt text](/img/Screen Shot 2015-08-04 at 23.34.25.png)

~~~java 
Caused by: java.lang.RuntimeException: Stack deobfuscation example exception
    at com.druk.myapplication.MainActivity$CrashHelper.crash(Unknown Source)
    at com.druk.myapplication.MainActivity$CrashHelper.access$000(Unknown Source)
    at com.druk.myapplication.MainActivity.onCreate(Unknown Source)
    at android.app.Activity.performCreate(Activity.java:6162)
    at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:2370)
    at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:2477)
    at android.app.ActivityThread.-wrap11(ActivityThread.java)
    at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1345)
    at android.os.Handler.dispatchMessage(Handler.java:102)
    at android.os.Looper.loop(Looper.java:148)
    at android.app.ActivityThread.main(ActivityThread.java:5415)
    at java.lang.reflect.Method.invoke(Native Method)
    at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:725)
    at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:615)
~~~

Хорошо когда в методе у нас всего одна строка, но на практике такое встречается редко. Поэтому неплохо было бы получить номер строки вместо Unknown Source. Согласно [официальной документации](http://proguard.sourceforge.net/manual/examples.html#stacktrace) для этого нужно в файл настроек proguard добавить
 
~~~java
-printmapping out.map
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
~~~

Первая строка в нашем случае не нужна, потому что она включена в Android проектах по умолчанию. Третья строка включает сохранение имен исходных файлов и таблицы номеров строк (что мы и хотели получить). Но стоит обратить внимание на вторую строку. Это правило переименовывает все имена исходных файлов в  "SourceFile", что является весьма важным в обфускации таких языков как Java, где зачастую Class name == Source file name. Также это возволяет не выдать внутрених классов, так как после обфускации связь между внутреним и внешним классами обычно разрывается.

В итоге после добавления новых правил мы получим следующую трассировку стека:

~~~java
Caused by: java.lang.RuntimeException: Stack deobfuscation example exception
    at com.druk.myapplication.a.b(SourceFile:42)
    at com.druk.myapplication.a.a(SourceFile:40)
    at com.druk.myapplication.MainActivity.onCreate(SourceFile:15)
    at android.app.Activity.performCreate(Activity.java:6162)
    at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:2370)
    at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:2477)
    at android.app.ActivityThread.-wrap11(ActivityThread.java)
    at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1345)
    at android.os.Handler.dispatchMessage(Handler.java:102)
    at android.os.Looper.loop(Looper.java:148)
    at android.app.ActivityThread.main(ActivityThread.java:5415)
    at java.lang.reflect.Method.invoke(Native Method)
    at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:725)
    at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:615)
~~~

И после деобфускации:

~~~java
Caused by: java.lang.RuntimeException: Stack deobfuscation example exception
    at com.druk.myapplication.MainActivity$CrashHelper.crash(SourceFile:42)
    at com.druk.myapplication.MainActivity$CrashHelper.access$000(SourceFile:40)
    at com.druk.myapplication.MainActivity.onCreate(SourceFile:15)
    at android.app.Activity.performCreate(Activity.java:6162)
    at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:2370)
    at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:2477)
    at android.app.ActivityThread.-wrap11(ActivityThread.java)
    at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1345)
    at android.os.Handler.dispatchMessage(Handler.java:102)
    at android.os.Looper.loop(Looper.java:148)
    at android.app.ActivityThread.main(ActivityThread.java:5415)
    at java.lang.reflect.Method.invoke(Native Method)
    at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:725)
    at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:615)
~~~

Подведем итог: залог успешной поддержки обфусцированного приложения это сохранения всех mapping файлов для всех выпущенных сборок. Хорошой практикой есть построение сборок на CI сервере с сохрарнением apk файлов и mapping файлов с тегами соотвествующих сборок (например 4 первых символа hash коммита). В таком случае если вы знаете с какой сборки былa получена трассировка стека, вы будете знать где искать соответсующий mapping файл. Также возможно стоит посмотреть в сторону сторонних сервисов сбора информации о аварийных ситуациях. Например, такие сервисы как Crashlytics деобфусцируют трасировки стеков на стороне сервера, что весьма удобно и не требует никаких дополнительных действий со стороны разработчика. Но вы должны четко понимать что при каждом построении сборки ваши mapping файлы будут отправляться на сервера Crashlytics. Что может быть не безопасно, ведь человек завладевший этими файлами не будет имееть никаких ограничений по деобфускации всего исходного кода вашего приложения.