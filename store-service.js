/********************************************************************************

WEB322 – Assignment 4
I declare that this assignment is my own work in accordance with Seneca Academic Policy. 
No part of this assignment has been copied manually or electronically from any other source 
(including 3rd party web sites) or distributed to other students.

Name: Ehsan Mahmood
Student ID: 115028227
Date: 30/10/2024
Repl.it Web App URL: https://replit.com/@ehsanmahmood202/web322-app-assignment4
GitHub Repository URL: https://github.com/emahmood1/web322-app-assignment4

********************************************************************************/

const fs = require('fs');
let items = [];
let categories = [];

// Helper function to write to JSON file
function saveItemsToFile() {
    return new Promise((resolve, reject) => {
        fs.writeFile('./data/items.json', JSON.stringify(items, null, 4), 'utf8', (err) => {
            if (err) {
                reject('Unable to save items to file');
            } else {
                resolve();
            }
        });
    });
}

// Initialize items and categories from JSON files
function initialize() {
    return new Promise((resolve, reject) => {
        fs.readFile('./data/items.json', 'utf8', (err, data) => {
            if (err) {
                reject('Unable to read items file');
                return;
            }
            try {
                items = JSON.parse(data);
                if (!Array.isArray(items)) throw new Error('Invalid items format');
            } catch (error) {
                reject('Invalid items JSON structure');
                return;
            }

            fs.readFile('./data/categories.json', 'utf8', (err, data) => {
                if (err) {
                    reject('Unable to read categories file');
                    return;
                }
                try {
                    categories = JSON.parse(data);
                    if (!Array.isArray(categories)) throw new Error('Invalid categories format');
                } catch (error) {
                    reject('Invalid categories JSON structure');
                    return;
                }
                resolve();
            });
        });
    });
}

// Get all items
function getAllItems() {
    return new Promise((resolve, reject) => {
        if (items.length === 0) {
            resolve([]); // Return empty array instead of rejecting
        } else {
            resolve(items);
        }
    });
}

// Get published items
function getPublishedItems() {
    return new Promise((resolve, reject) => {
        const publishedItems = items.filter((item) => item.published === true);
        if (publishedItems.length === 0) {
            resolve([]); // Return empty array instead of rejecting
        } else {
            resolve(publishedItems);
        }
    });
}

// Add a new item
function addItem(itemData) {
    return new Promise((resolve, reject) => {
        // Assign unique ID
        itemData.id = items.length + 1;
        itemData.published = itemData.published || false;

        // Add item to in-memory array
        items.push(itemData);

        // Persist changes to items.json
        saveItemsToFile()
            .then(() => resolve())
            .catch((err) => reject(err));
    });
}


function addItem(itemData) {
    return new Promise((resolve, reject) => {
        itemData.id = items.length + 1;
        itemData.published = itemData.published || false;

        // Add the current date in the format YYYY-MM-DD
        const currentDate = new Date();
        itemData.postDate = currentDate.toISOString().split('T')[0];

        items.push(itemData);

        saveItemsToFile()
            .then(() => resolve())
            .catch((err) => reject(err));
    });
}

// Get all categories
function getCategories() {
    return new Promise((resolve, reject) => {
        if (categories.length === 0) {
            resolve([]); // Return empty array instead of rejecting
        } else {
            resolve(categories);
        }
    });
}


function getPublishedItemsByCategory(category) {
    return new Promise((resolve, reject) => {
        const filteredItems = items.filter(
            (item) => item.published === true && item.category == category
        );
        if (filteredItems.length > 0) {
            resolve(filteredItems);
        } else {
            reject("No items found for the selected category.");
        }
    });
}

module.exports = { initialize, getAllItems, getPublishedItems, addItem, getCategories, getPublishedItemsByCategory  };
