@echo off
echo Checking Rust...
rustc --version
if %errorlevel% neq 0 echo rustc not found
cargo --version
if %errorlevel% neq 0 echo cargo not found
