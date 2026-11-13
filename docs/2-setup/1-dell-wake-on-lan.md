# Dell systems: Wake-on-LAN

Enable the hardware first, then add the system in Wake Up Support.

1. Open the Dell BIOS/UEFI setup and enable Wake-on-LAN. On many Dell systems this is under
   Power Management.
2. Enable any option that allows wake from the built-in wired network adapter. Use LAN only
   unless the site specifically needs wake from another power state.
3. In Windows Device Manager, open the Ethernet adapter, then enable wake options in the
   Power Management and Advanced tabs.
4. Add the system in Wake Up Support using the system name, MAC address, optional IP address,
   subnet broadcast address and WOL port. Port 9 is the usual default.

The broadcast address should match the subnet, for example `192.168.154.255`.
