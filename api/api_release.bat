SET RELEASE_DIR=D:\Homepage\samchon.github.io\framework\api\
SET PORTFOLIO_DIR=D:\OneDrive\Portfolio\Samchon_Framework\

:: ----------------------------------------------------------------
::    CLEAR ORDINARY API DOCUMENTS
:: ----------------------------------------------------------------
IF EXIST "%RELEASE_DIR%" rd "%RELEASE_DIR%" /S /Q
mkdir "%RELEASE_DIR%"

:: ----------------------------------------------------------------
::    C++ API DOCUMENT
:: ----------------------------------------------------------------
::DOCUMENTATE
doxygen cpp.doxygen
move "%RELEASE_DIR%_cpp\html" "%RELEASE_DIR%cpp"

::COPY TO PORTFOLIO
xcopy "%RELEASE_DIR%_cpp\html\*.pdf" "%PORTFOLIO_DIR%" /s /Y

::TRUNCATE DREGS
rd "%RELEASE_DIR%_cpp" /S /Q

:: ----------------------------------------------------------------
::    FLEX API DOCUMENT
:: ----------------------------------------------------------------
::PATH
SET ASDOC_DIR=C:\Program Files (x86)\Adobe\Adobe Flash Builder 4.6\sdks\4.6.0\bin\
SET FLEX_SRC_DIR=..\flex\src\

::DOCUMENTATE
"%ASDOC_DIR%asdoc" -source-path %FLEX_SRC_DIR% -doc-sources %FLEX_SRC_DIR% -output "%RELEASE_DIR%flex"

:: ----------------------------------------------------------------
::    TYPE_SCRIPT API DOCUMENT
:: ----------------------------------------------------------------
::PATH
SET TS_SRC_DIR=../ts/src/

::DOCUMENTATE
typedoc --target ES5 --out "%RELEASE_DIR%ts" "%TS_SRC_DIR%" --mode file --includeDeclarations

:: ----------------------------------------------------------------
::    COMMIT TO GITHUB (SAMCHON.GITHUB.IO)
:: ----------------------------------------------------------------
::cd "%RELEASE_DIR%..\.."
::call release.bat