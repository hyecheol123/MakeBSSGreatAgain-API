# MakeBSSGreatAgain API

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)


API for Make BSS Great Again Project

Supported API and features are listed in the [API Documentation](https://hyecheol123.github.io/MakeBSSGreatAgain-API-Documentation/#section/SecuritySchemes)


## Scripts

Here is the list for supported npm/yarn scripts.
These are used to lint, test, build, and run the code.

1. `lint`: lint the code
2. `lint:fix`: lint the code and try auto-fix
3. `build`: compile typescript codes (destination: `dist` directory)
4. `clean`: remove the compiled code
5. `start`: run the codes
6. `test`: run the test codes


## Dependencies/Environment

Developed and tested with `Ubuntu 20.04.2 LTS`, with `Node v14.17.0`.

To configure the typescript development environment easily, [gts](https://github.com/google/gts) has been used.
Based on the `gts` style rules, I modified some to enforce rules more strictly.
To see the modification, please check [`.eslintrc.json` file](https://github.com/hyecheol123/MakeBSSGreatAgain-API/blob/main/.eslintrc.json).

For the database, this project is relying on [MariaDB](https://mariadb.org/), which almost identical with the MySQL.

Data Diagram for the database
![ERD.svg](img/ERD.svg)

<details>
  <summary>Click to see SQL Queries to create tables.</summary>
  
</details>