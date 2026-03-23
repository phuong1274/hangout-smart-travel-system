# How to Run HSTS Unit Tests

**Project:** `HSTS.BE/HSTS.Tests`
**Framework:** xUnit 2.9 — 49 tests across 10 auth command handler test classes

---

## 1. Command Line (dotnet CLI)

The fastest and most reliable way. Works everywhere.

### Run all tests
```bash
cd D:\hangout-smart-travel-system\HSTS.BE
dotnet test HSTS.Tests
```

### Run all tests with detailed output (see each test name)
```bash
dotnet test HSTS.Tests -v normal
```

### Run a single test class
```bash
dotnet test HSTS.Tests --filter "ClassName=HSTS.Tests.Auth.LoginCommandTests"
```

### Run a single test method
```bash
dotnet test HSTS.Tests --filter "FullyQualifiedName=HSTS.Tests.Auth.LoginCommandTests.Handle_ValidCredentials_ReturnsAuthResult"
```

### Run tests by keyword (matches class or method name)
```bash
# All tests with "Login" in the name
dotnet test HSTS.Tests --filter "Login"

# All tests that test error cases
dotnet test HSTS.Tests --filter "ReturnsError"
```

### Run and see pass/fail summary with timing
```bash
dotnet test HSTS.Tests --logger "console;verbosity=detailed"
```

### Expected output (all passing)
```
Test Run Successful.
Total tests: 49
     Passed: 49
 Total time: ~0.7 Seconds
```

---

## 2. Visual Studio

### First-time setup
1. Open `D:\hangout-smart-travel-system\HSTS.BE\HSTS.BE.slnx` in Visual Studio
2. Go to **View → Test Explorer** (or press `Ctrl+E, T`)
3. Wait for tests to be discovered (may take a few seconds on first open)

### Run all tests
- In Test Explorer: click **Run All Tests** (the green double-play button ▶▶)
- Or press: `Ctrl+R, A`

### Run a single test class
- In Test Explorer, find the class (e.g. `LoginCommandTests`)
- Right-click → **Run**
- Or click the green ▶ button next to the class name

### Run a single test method
- In Test Explorer, expand the class → find the test method
- Right-click → **Run**
- Or open the test file, click the green ▶ icon in the gutter next to the `[Fact]`

### Run tests from inside the code file
- Open any test file (e.g. `LoginCommandTests.cs`)
- Click the **green circle icon** (●) in the left gutter next to a `[Fact]`
- Click **Run Test**

### Re-run failed tests only
- In Test Explorer: click **Run Failed Tests** button
- Or press: `Ctrl+R, F`

### View results
- Green checkmark ✅ = passed
- Red X ❌ = failed (click to see error message and stack trace)
- Test Explorer bottom panel shows output for the selected test

### Tips
- Use the search box in Test Explorer to filter by name (e.g. type `"Google"` to see only `GoogleLoginCommandTests`)
- Right-click a test → **Debug** to set breakpoints and step through handler code

---

## Test Class Reference

| Class | File | Tests |
|-------|------|-------|
| `RegisterCommandTests` | `Auth/RegisterCommandTests.cs` | 4 |
| `LoginCommandTests` | `Auth/LoginCommandTests.cs` | 6 |
| `VerifyEmailCommandTests` | `Auth/VerifyEmailCommandTests.cs` | 4 |
| `ResendOtpCommandTests` | `Auth/ResendOtpCommandTests.cs` | 6 |
| `ForgotPasswordCommandTests` | `Auth/ForgotPasswordCommandTests.cs` | 5 |
| `ResetPasswordCommandTests` | `Auth/ResetPasswordCommandTests.cs` | 5 |
| `ChangePasswordCommandTests` | `Auth/ChangePasswordCommandTests.cs` | 5 |
| `LogoutCommandTests` | `Auth/LogoutCommandTests.cs` | 2 |
| `RefreshTokenCommandTests` | `Auth/RefreshTokenCommandTests.cs` | 6 |
| `GoogleLoginCommandTests` | `Auth/GoogleLoginCommandTests.cs` | 6 |
| **Total** | | **49** |

---

## Troubleshooting

**Tests not discovered in VS/Rider:**
- Make sure the solution is fully built first: `dotnet build HSTS.BE.slnx`
- In VS: Test Explorer → click the refresh icon
- In Rider: Unit Tests window → click Refresh

**`dotnet test` build errors:**
- Run `dotnet build HSTS.Tests` first to see the exact error
- Make sure you are in `D:\hangout-smart-travel-system\HSTS.BE` when running the command

**Test fails with "No such method" or "Type not found":**
- The handler signature may have changed — rebuild: `dotnet build HSTS.Tests`
