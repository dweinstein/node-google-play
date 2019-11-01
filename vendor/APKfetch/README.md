# APKfetch
Library for downloading APK files from the Google Play store.


### Dependencies
* Python 2.7+
* requests
* protobuf
* PyCryptodome

The Python packages can be installed with

    pip install -r requirements.txt


### Using the library

Using the library is as simple as:

```python
from APKfetch.apkfetch import APKfetch

def main():
  apk = APKfetch()
  apk.login('you@gmail.com', 'yourpassword')
  apk.fetch('com.somepackage')

if __name__ == '__main__':
    main()
```

Note that the example creates a new android id. If you wish to use an existing id, you should login using:

```python
apk.login('you@gmail.com', 'yourpassword', 'yourandroidid')
```

### Using the CLI

```
usage: apkfetch.py [--help] [--user USER] [--passwd PASSWD]
                   [--androidid ANDROIDID] [--version VERSION]
                   [--package PACKAGE]

Fetch APK files from the Google Play store

optional arguments:
  --help, -h            Show this help message and exit
  --user USER, -u USER  Google username
  --passwd PASSWD, -p PASSWD
                        Google password
  --androidid ANDROIDID, -a ANDROIDID
                        AndroidID
  --version VERSION, -v VERSION
                        Download a specific version of the app
  --package PACKAGE, -k PACKAGE
                        Package name of the app
``` 