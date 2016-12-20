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

var config = new Configstore(manifest.name);

var inputPath = null;
var outputPath = null;
var region = null;

function cexit(message) {
	console.error(chalk.red(message));
	process.exit(1);
}

function cwarn(message) {
	console.error(chalk.yellow(message));
}

function getOpt() {
	return [{
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
	}];
}

function startOver() {	
	if (!fs.existsSync(inputPath)) cexit("Input directory <" + inputPath + "> doesn't exists");
	if (!fs.existsSync(outputPath)) cexit("Output directory <" + outputPath + "> doesn't exists");
	if (!region) cexit("Region is empty");
	
	var files = fs.readdirSync(inputPath).map(function(fileName) {
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
	});

	if (files.length === 0) {
		cwarn("No files found");
	} else {
		files.forEach(processFile);
	}
}

function processFile(fileObj) {
	new ExifImage({ 
		image: fileObj.inputFile
	}, function(err, data) {
		if (!err && data && data.exif) fileObj.exif = data.exif;
		choicePathForFile(fileObj);
	});
}

function choicePathForFile(fileObj) {
	var date = null;

	if (fileObj.exif && fileObj.exif.DateTimeOriginal) {
		date = moment(fileObj.exif.DateTimeOriginal.substr(0,10), "YYYY:MM:DD");
	} else {
		cwarn("File <" + fileObj.inputFile + "> doesn't contain EXIF data - fallback to creation date");
		date = moment( fs.statSync(fileObj.inputFile).birthtime );
	}

	fileObj.outputDirectory = path.join(
		outputPath,
		(date || moment()).format('YYYY'), 
		region, 
		(date ? date.format('YYYY-MM-DD') : 'NO_DATE')
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
	inquirer.prompt(getOpt(), function(answers) {
		config.set('inputDirectory', answers.inputDirectory);
		config.set('outputDirectory', answers.outputDirectory);
		config.set('region', answers.region);
	});
	process.exit();	
}

if (argv.cron) {
	inputPath = config.get('inputDirectory').replace(/\\ /g, ' ').trim();
	outputPath = config.get('outputDirectory').replace(/\\ /g, ' ').trim();
	region = config.get('region');
	startOver();
} else {
	inquirer.prompt(getOpt(), function(answers) {
		inputPath = answers.inputDirectory.replace(/\\ /g, ' ').trim();
		outputPath = answers.outputDirectory.replace(/\\ /g, ' ').trim();
		region = answers.region;
		startOver();
	});
}

