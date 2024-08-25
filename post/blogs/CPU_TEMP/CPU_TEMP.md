### 读取手机CPU/电池温度

两种方法，一种通过获取传感器列表读取值，但大多数情况读到的都是空的

其二也是常用的，但需要root

#### 原理

android基于linux，众所周知linux万物皆文件，信息也都是存在文件里的，而cpu的温度信息就存在/**sys/class/thermal/thermal_zone{*}/temp** 下。

这里的`*`对应了手机的内核文件夹编号，例如某些手机的`*`可能有17个（0~16），但是需要注意的是**并不是所有的文件夹都是存储CPU内核的信息**

那怎么判断哪个文件夹目录使我们需要获取的信息目录呢？

> 这里介绍一个方式：  
> 我们都知道，现在手机的处理器要不是高通（Qualcomm），要不是联发科（MTK），当然还有其他的类型，但是市场主流是上边的两个。而这两个CPU内核都有固定的名字。  
> 我们可以通过`cat`命令读取`/sys/class/thermal/thermal_zone*/type`获取到的字符串来判断是哪种类型的CPU。也可以判断该目录是否是CPU内核信息。

1. **pm8550-bcl-lvl0, pm8550-bcl-lvl1, pm8550-bcl-lvl2**:
   
   - 这些通常与电池充电相关，监控电池充电电流和电压等。

2. **cpuss-0, cpuss-1, cpuss-2, cpuss-3**:
   
   - 这些与 CPU 子系统相关，可能监控不同 CPU 核心或核心组的温度。

3. **cpu-0-0-0, cpu-0-1-0, cpu-1-0-0, cpu-1-0-1 等**:
   
   - 这些通常与具体的 CPU 核心相关，监控单个核心的温度。

4. **sdr0_pa, sdr0**:
   
   - 这些可能与 SDR（软件定义无线电）相关，监控其温度。

5. **mmw_ific0, mmw0, mmw1, mmw2**:
   
   - 这些可能与毫米波（mmWave）相关，用于监控其温度。

6. **aoss-1, aoss-2**:
   
   - 这些可能与 AOSS（高级操作系统服务）相关，监控其温度。

7. **gpuss-0 到 gpuss-7**:
   
   - 这些与 GPU 子系统相关，监控 GPU 的不同部分的温度。

8. **vbat**:
   
   - 这个热区与电池电压相关。

9. **virt-front-therm, virt-back-therm, virt-frame-therm**:
   
   - 这些可能是虚拟热区，用于合成或估算设备前面板、背面板或框架的温度。

10. **battery, battery-high, battery-low**:
    
    - 这些显然与电池温度相关，可能分别监控电池的不同温度阈值。
    - 

不要问我怎么来的，多使用ADB真机调试，使用以上的命令你也可以总结出来这些东西。

通过for循环，遍历`thermal_zone`，`cat type`出来的信息判断是否包含了以上两种CPU的关键字，则可以判断该目录是否保存了CPU内核信息。  
只要判断了那些目录是属于内核信息的，获取温度就手到拈来。只需要`cat`另一个参数`temp`那么输出的信息就是我们需要的温度啦。

就是这么简单。

贴下代码

```kotlin
fun readTemperature(zone: Int): Float? {
        val path = "/sys/class/thermal/thermal_zone$zone/temp"
        return try {
            val temp = File(path).readText().trim().toFloat() / 1000.0f
            temp
        } catch (e: IOException) {
            null
        }
    }

    fun getCpuZones(): List<Int> {
        val thermalZonesPath = "/sys/class/thermal/"
        val thermalZonesDir = File(thermalZonesPath)
        val zones = mutableListOf<Int>()

        if (thermalZonesDir.exists() && thermalZonesDir.isDirectory) {
            try {
                thermalZonesDir.listFiles { file -> file.name.startsWith("thermal_zone") }?.forEach { file ->
                    val zoneIndex = file.name.removePrefix("thermal_zone").toIntOrNull()
                    if (zoneIndex != null) {
                        // 过滤出 CPU 热区，一般以 cpuss 前缀标识
                        val typeFile = File(file, "type")
                        if (typeFile.exists()) {
                            val type = typeFile.readText().trim()
                            if (type.startsWith("cpuss")) {
                                zones.add(zoneIndex)
                            }
                        }
                    }
                }
            } catch (e: IOException) {
                // 处理读取文件时的异常
                e.printStackTrace()
            }
        }

        return zones
    }

    fun getCpuAverageTemperature(): String? {
        val cpuZones = getCpuZones()
        val temperatures = cpuZones.mapNotNull { readTemperature(it) }

        return if (temperatures.isNotEmpty()) {
            val averageTemp = temperatures.sum() / temperatures.size
            // 保留一位小数并添加单位℃
            String.format("%.1f℃", averageTemp)
        } else {
            null
        }
    }
```

### 获取电池温度就很ez了

```kotlin
fun getBatteryTemperature(): String {
        return try {
            val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val temp = intent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1)?.toFloat() ?: -1f
            "${temp / 10}°C"
        } catch (e: Exception) {
            e.printStackTrace()
            "Error"
        }
    }
```

#### 获取电流电压功率

```kotlin
fun getBatteryCurrentNow(): String {
        return try {
            val process = Runtime.getRuntime().exec("cat /sys/class/power_supply/battery/current_now")
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val currentNow = reader.readLine().toInt() / 1000.0f
            reader.close()
            "$currentNow mA"
        } catch (e: Exception) {
            e.printStackTrace()
            "Error"
        }
    }

    fun getBatteryVoltage(): String {
        return try {
            val process = Runtime.getRuntime().exec("cat /sys/class/power_supply/battery/voltage_now")
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val voltageNow = reader.readLine().toInt() / 1000.0f
            reader.close()
            "$voltageNow mV"
        } catch (e: Exception) {
            e.printStackTrace()
            "Error"
        }
    }

    fun getBatteryPower(): String {
        return try {
            val currentNow = getBatteryCurrentNow().toFloatOrNull() ?: return "Error"
            val voltageNow = getBatteryVoltage().toFloatOrNull() ?: return "Error"
            val power = (currentNow * voltageNow) / 1000 // 转换为瓦特
            "$power W"
        } catch (e: Exception) {
            e.printStackTrace()
            "Error"
        }
    }
```
