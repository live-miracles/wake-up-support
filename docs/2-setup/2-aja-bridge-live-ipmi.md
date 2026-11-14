# AJA Bridge Live: IPMI power control

AJA Bridge Live power control uses IPMI instead of Wake-on-LAN. Use SSH to prepare the IPMI
user, then add the AJA LAN IPMI address and credentials in the app.

## Log in to the ABL CLI

```sh
ssh transcoder@<abl-ip-address>
```

## Find the IPMI LAN address

```sh
sudo ipmitool lan print
```

## Confirm the admin user number

The admin user is usually user 2, but confirm it before changing the password.

```sh
sudo ipmitool user list
```

## Set or reset the IPMI password

```sh
sudo ipmitool user set password 2
```

## Enable admin IPMI access

```sh
sudo ipmitool user enable 2
sudo ipmitool channel setaccess 1 2 link=on ipmi=on callin=on privilege=4
```

## Fix channel cipher suites

Allow the standard LAN channel cipher suites and explicitly permit cipher suite 3.

```sh
sudo ipmitool channel setaccess 1 2 callin=on ipmi=on link=on privilege=4
sudo ipmitool raw 0x06 0x40 0x01 0x42 0x44
```

## Add the device in the app

Click **ABL** and enter the device name, the AJA LAN 1 IPMI IP, the AJA IP address and the
IPMI username and password. Passwords are saved on this computer with the rest of the app
settings.

## Why the app uses ipmitool

The first version of the app used `ipmiutil.exe` for AJA power control, but it did not work
with AJA Bridge Live. The app now bundles `ipmitool.exe` (with the Cygwin DLLs it needs),
which does connect to the AJA unit. Use the `ipmitool` commands above when preparing the
device.
