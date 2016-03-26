# googlephotorg : Google Photo organizer

With this tool you can easily move the uploaded photos by Google Photos in the default directory (`~/Google Drive/Google Photos`) in a better file-system structured directory like this:

`~/Google Drive/Photos/2016/Parma/2016-03-26/FILE.jpg`

Why? Because I don't really like to have all photos in a single directory, an I want to keep my photo library organized.

It read the EXIF data of the image to detect the date. If no EXIF is found, a fallback to modified time of the file is provided. 

**Disclaimer: This tool move files, so keep attention!**

## Install

```
npm -g install googlephotorg
```

## Configure

```
googlephotorg --configure
```

## Usage

```
googlephotorg
```

## Extra: install a CRON

```
crontab -e
```

And add 

```
0 * * * * /usr/local/bin/googlephotorg
```

## LICENSE

MIT.