# googlephotorg : Google Photo organizer

![NPM version](https://img.shields.io/npm/dm/googlephotorg.svg)
![NPM downloads](https://img.shields.io/npm/dt/googlephotorg.svg)

With this tool you can easily move the uploaded photos by Google Photos in the default directory (`~/Google Drive/Google Photos`) in a better file-system structured directory like this:

`~/Google Drive/Photos/2016/Parma/2016-03-26/FILE.jpg`

Why? Because I don't really like to have all photos in a single directory, an I want to keep my photo library organized.

It read the EXIF data of the image to detect the date. If no EXIF is found, a fallback to modified time of the file is provided. 

**Disclaimer: This tool move files, so keep attention!**

## Install

```
npm -g install googlephotorg
```

## Usage

```
googlephotorg
```

## Configure for a CRON job

```
googlephotorg --configure
```

## Usage in CRON

It will read from the configured values instead to ask.

```
googlephotorg --cron`
```

```
crontab -e
```

And add 

```
0 * * * * /usr/local/bin/googlephotorg
```

## LICENSE

MIT.