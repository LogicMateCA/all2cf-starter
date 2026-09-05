---
id: windows-android-host-builder
title: Route WSL Android projects through the Windows Host Runner
status: implemented
affectedModules: [mobile, release, setup]
docsImpact: [README.md, RELEASE.md, 碰见问题记录.md]
---

# Outcome

Android defaults to the Windows Host Runner rather than inspecting Linux for a Windows SDK. Host selection and SDK/JDK references are centralized in `/opt/1panel/apps/super.env`; EAS remains explicit opt-in.

# Verification

- Windows SDK, ADB and JDK readiness
- Logicmate Starter plugin 26/26 tests
- `npm run mobile:targets:contract`
- Starter typecheck and site builds

# Release

Released as Starter 2.3.4 after source qualification, Engine verification and public archive validation.
