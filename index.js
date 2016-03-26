#!/usr/bin/env node

var _ = require('underscore');
var Configstore = require('configstore');
var inquirer = require("inquirer");
var chalk = require('chalk');
var fs = require('fs-extended');
var path = require('path');
var ExifImage = require('exif').ExifImage;
var moment = require('moment');

var manifest = require('./package.json');
var argv = require('yargs').argv;

var config = new Configstore(manifest.name, {
	inputDirectory: ""
});

function cexit(message) {
	console.error(chalk.red(message));
	process.exit(1);
}

function cwarn(message) {
	console.error(chalk.yellow(message));
}

function configure() {
	inquirer.prompt([
	{
		type: "input",
		name: "inputDirectory",
		message: "Google Photos (input) directory",
		default: config.get('inputDirectory') || process.env.HOME + '/Google Drive/Google Photos'
	},
	{
		type: "input",
		name: "outputDirectory",
		message: "Photos (output) directory",
		default: config.get('outputDirectory') || process.env.HOME + '/Google Drive/Photos'
	},
	{
		type: "input",
		name: "region",
		message: "Subdirectory",
		default: config.get('region') || 'Home'
	},
	], function(answers) {
		config.set('inputDirectory', answers.inputDirectory);
		config.set('outputDirectory', answers.outputDirectory);
		config.set('region', answers.region);
	});
}

function startOver() {	
	fs.readdirSync(inputPath).map(function(fileName) {
		var inputFile = path.join(inputPath, fileName);
		var stat = fs.statSync(inputFile);
		var keep = stat.isFile() && fileName.substr(0,1) !== '.';
		return {
			inputFile: inputFile,
			stat: stat,
			keep: keep
		};
	}).filter(function(fileObj) {
		return fileObj.keep;
	}).forEach(processFile);
}

function processFile(fileObj) {
	try {
		new ExifImage({ 
			image: fileObj.inputFile
		}, function(err, data) {
			if (!err && data.exif) fileObj.exif = data.exif;
			choicePathForFile(fileObj);
		});
	} catch (err) {
		choicePathForFile(fileObj);
	}
}

function choicePathForFile(fileObj) {
	var date = null;

	if (fileObj.exif && fileObj.exif.DateTimeOriginal) {
		date = moment(fileObj.exif.DateTimeOriginal.substr(0,10), "YYYY:MM:DD");
	} else if (fileObj.stat.ctime) {
		date = moment(new Date(fileObj.stat.mtime));
	} else {
		date = moment();
	}

	fileObj.outputDirectory = path.join(
		outputPath,
		date.format('YYYY'), 
		region, 
		date.format('YYYY-MM-DD')
	);
	fileObj.outputFile = path.join(fileObj.outputDirectory, path.basename(fileObj.inputFile));

	moveFile(fileObj);
}

function moveFile(fileObj) {
	var baseConsoleFile = fileObj.outputFile.replace(outputPath, '');

	if (fs.existsSync(fileObj.outputFile)) {
		cwarn("File <" + baseConsoleFile + "> already exists");
	} else {
		console.log("Moving <" + baseConsoleFile + ">");
		fs.createDirSync(fileObj.outputDirectory);
		fs.moveSync(fileObj.inputFile, fileObj.outputFile);
	}
}


//////////
// Init //
//////////

if (argv.configure) {
	configure();
} else {
	
	var inputPath = config.get('inputDirectory');
	if (!fs.existsSync(inputPath)) {
		cexit("Input directory <" + inputPath + "> doesn't exists");
	}

	var outputPath = config.get('outputDirectory');
	if (!fs.existsSync(outputPath)) {
		cexit("Output directory <" + outputPath + "> doesn't exists");
	}

	var region = config.get('region');
	if (!region) {
		cexit("Region is empty");
	}

	startOver();

}
