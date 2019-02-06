#!/usr/bin/env node

const Configstore = require('configstore');
const inquirer = require("inquirer");
const chalk = require('chalk');
const fs = require('fs-extended');
const path = require('path');
const ExifImage = require('exif').ExifImage;
const moment = require('moment');
const walk = require('walk');

const manifest = require('./package.json');
const argv = require('yargs').argv;

function clog(message) {
	console.error(chalk.blue(message));
}

function csucc(message) {
	console.error(chalk.green(message));
}

function cerr(message) {
	console.error(chalk.red(message));
}

function cwarn(message) {
	console.error(chalk.yellow(message));
}

function getOpt() {
	return [{
		type: 'input',
		name: 'inputDirectory',
		message: 'Google Photos (input) directory',
		default: config.get('inputDirectory') || process.env.HOME + '/Google Drive/Google Photos'
	},
	{
		type: 'input',
		name: 'outputDirectory',
		message: 'Photos (output) directory',
		default: config.get('outputDirectory') || process.env.HOME + '/Google Drive/Photos'
	},
	{
		type: 'input',
		name: 'region',
		message: 'Subdirectory',
		default: config.get('region') || 'Home'
	}];
}

async function startOver(inputPath, outputPath, region = 'Home') {
	return new Promise((resolve, reject) => {
		if (!fs.existsSync(inputPath)) {
			cerr(`Input directory <${inputPath}> doesn't exists`);
			return reject();
		}

		if (!fs.existsSync(outputPath)) {
			cerr(`Output directory <${outputPath}> doesn't exists`);
			return reject();
		}

		let countOfProcessedFiles = 0;
		let countOfErredFiles = 0;

		const walker  = walk.walk(inputPath, { followLinks: false });

		walker.on('file', async(root, stat, next) => {
			const inputFile = path.join(root, stat.name);
			const keep = stat.name.substr(0,1) !== '.';
		
			if (!keep) {
				cwarn(`Ignoring file ${stat.name}`);
				next();
				return;
			}

			try {
				await processFile(inputFile, stat, outputPath, region);
				countOfProcessedFiles++;
			} catch (err) {
				cerr(err);
				countOfErredFiles++;
			}

			next();
		});

		walker.on('end', function() {	
			csucc(`Finished! ${countOfProcessedFiles} files processed, ${countOfErredFiles} files not processed`);
			resolve();
		});
	});
}

function processFile(inputFile, stat, outputPath, region) {
	return new Promise((resolve, reject) => {
		new ExifImage({ 
			image: inputFile
		}, async(err, data) => {
			try {
				const outputFile = await choicePathForFile(inputFile, stat, data ? data.exif : null, outputPath, region);
				await moveFile(inputFile, outputFile);
				resolve();
			} catch (err) {
				reject(err);
			}
		});
	});
}

async function choicePathForFile(inputFile, stat, exif, outputPath, region) {
	let date = null;

	if (exif && (exif.DateTimeOriginal || exif.CreateDate)) {
		date = moment((exif.DateTimeOriginal || exif.CreateDate).substr(0,10), "YYYY:MM:DD");
	} else if (stat.birthtime) {
		cwarn(`File <${inputFile}> doesn't contain EXIF data - fallback to creation date`);
		date = moment(stat.birthtime);
	} else {
		cwarn(`File <${inputFile}> doesn't contain birthdate - fallback to NOW`);
		date = moment();
	}

	const inputFileBasename = path.basename(inputFile);
	return path.join(outputPath, date.format('YYYY'), region, date.format('YYYY-MM-DD'), inputFileBasename);
}

async function moveFile(inputFile, outputFile) {
	if (fs.existsSync(outputFile)) {
		throw `File <${outputFile}> already exists, refusing to overwrite`;
	}

	clog(`Moving <${inputFile}> to <${outputFile}>`);

	const dirName = path.dirname(outputFile);
	if (!fs.existsSync(dirName)) {
		clog(`Creating support directory ${dirName}`);
		fs.createDirSync(dirName);
	}

	fs.moveSync(inputFile, outputFile);
}

//////////
// Init //
//////////

const config = new Configstore(manifest.name);

if (argv.configure) {
	inquirer.prompt(getOpt(), (answers) => {
		config.set('inputDirectory', answers.inputDirectory);
		config.set('outputDirectory', answers.outputDirectory);
		config.set('region', answers.region);
	});
} else {
	if (argv.cron) {
		const inputPath = config.get('inputDirectory').replace(/\\ /g, ' ').trim();
		const outputPath = config.get('outputDirectory').replace(/\\ /g, ' ').trim();
		const region = config.get('region');
		startOver(inputPath, outputPath, region);
	} else {
		inquirer.prompt(getOpt(), (answers) => {
			const inputPath = answers.inputDirectory.replace(/\\ /g, ' ').trim();
			const outputPath = answers.outputDirectory.replace(/\\ /g, ' ').trim();
			const region = answers.region;
			startOver(inputPath, outputPath, region);
		});
	}
}

