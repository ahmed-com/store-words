require('dotenv').config();
const { createReadStream } = require('fs');

const mysql = require('mysql2');
const connection = mysql.createConnection({
	host: process.env.HOST,
	user: process.env.USER,
	database: process.env.DATABASE,
	password: process.env.PASSWORD,
});

const wordsStream = createReadStream(process.env.FILEPATH, { encoding: 'utf8' });

let previousLastElement = '';

wordsStream.on('data', (data) => {
	wordsStream.pause();

	const dataArr = splitIntoLines(data);
	const lastIndex = dataArr.length - 1;
	const firstElement = dataArr[0];
	const lastElement = dataArr[lastIndex];

	const parsedData = new Array(lastIndex);
	parsedData[0] = parseLine(previousLastElement + firstElement);

	previousLastElement = lastElement;

	for (let index = 1; index < lastIndex; index++) {
		parsedData[index] = parseLine(dataArr[index]);
	}

	storeRowsInDB([parsedData], () => {
		wordsStream.resume();
	});
});

wordsStream.on('end', () => {
	if (previousLastElement !== '') {
		storeRowsInDB([[parseLine(previousLastElement)]], () => {
			console.log('finished !');
			process.exit(1);
		});
	}
});

function parseLine(line) {
	return line.split(/\s+/);
}

function storeRowsInDB(rows, cb) {
	connection.query(
		'INSERT INTO words (word, word_count) VALUES ?',
		rows,
		(err) => {
			if (err) {
				console.log(rows);
				console.log(err);
				process.exit(1);
			}

			cb();
		}
	);
}

function splitIntoLines(str) {
	// return str.match(/[^\r\n]+/g);
	return str.split(/\r?\n/);
}
