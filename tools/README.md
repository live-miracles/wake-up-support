Place the `abl_ipmitool` folder (`ipmitool.exe` and its Cygwin DLLs) in this folder
before building the installer. `npm run check:tools` verifies it is complete.

Wake Up Support packages it with the app and uses it automatically for AJA
Bridge Live IPMI power control.

## Why ipmitool and not ipmiutil

The first version of the app used `ipmiutil.exe`, but it did not work with AJA Bridge Live,
so it was replaced by `ipmitool.exe`. Do not switch back without testing against a real AJA
unit.
