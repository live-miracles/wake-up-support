# Introduction

Wake Up Support is a small Windows app for powering on systems on your local network. It
sends Wake-on-LAN magic packets to ordinary computers, and uses IPMI to power AJA Bridge
Live devices on and off, since those do not support Wake-on-LAN.

## Add your first system

1. Enable the target hardware first: [Wake-on-LAN on Dell systems](../2-setup/1-dell-wake-on-lan.md)
   or [IPMI on an AJA Bridge Live](../2-setup/2-aja-bridge-live-ipmi.md).
2. Click **WOL** to add a Wake-on-LAN system, or **ABL** to add an AJA Bridge Live.
3. Click **On** on the system's row to power it on. AJA devices also have an **Off** button,
   which asks for confirmation first.

For a Wake-on-LAN system you enter a name, the MAC address, an optional IP address, the
subnet's directed broadcast address (for example `192.168.154.255`) and the port. Port 9 is
the usual default.

## Other features

- **Status dots** next to each address show whether the system is reachable (green), not
  reachable (red) or unknown (grey). A warning icon appears when an IP address and MAC address
  do not match what the network reports.
- **Scan** lists the devices found on the local subnet and lets you add them as systems.
- **Wake log** records the recent wake and power actions made from this computer.
- **Reorder** the rows by dragging the handle at the start of a row.
- **Import and export** the list of systems as a JSON file to move it to another computer.
