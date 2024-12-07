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

const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const dotenv = require('dotenv');
const exphbs = require('express-handlebars');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Middleware to determine the active route
app.use((req, res, next) => {
    const route = req.path.split('/')[1] || '';
    app.locals.activeRoute = `/${route}`;
    next();
});

// Handlebars setup
app.engine(
    '.hbs',
    exphbs.engine({
        extname: '.hbs',
        defaultLayout: 'main',
        helpers: {
            navLink: function (url, options) {
                return (
                    '<li class="nav-item">' +
                    '<a class="nav-link ' +
                    (url === app.locals.activeRoute ? 'active' : '') +
                    '" href="' +
                    url +
                    '">' +
                    options.fn(this) +
                    '</a></li>'
                );
            },
        },
    })
);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Enable sessions
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'defaultSecret',
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize the cart if it doesn't exist
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Debugging Middleware (Optional)
app.use((req, res, next) => {
    console.log('Session Cart:', req.session.cart);
    next();
});

// Configure Multer
const upload = multer();


//Routes
app.get('/', (req, res) => {
    res.redirect('/shop');
});


app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/shop', (req, res) => {
    const category = req.query.category || null;

    let viewData = {
        post: null,
        posts: [],
        categories: [],
        message: null,
        categoriesMessage: null
    };

    storeService.getPublishedItems()
        .then((posts) => {
            viewData.posts = posts;
            if (category) {
                return storeService.getPublishedItemsByCategory(category);
            } else {
                return Promise.resolve([]);
            }
        })
        .then((filteredPosts) => {
            if (filteredPosts.length > 0) {
                viewData.post = filteredPosts[0];
            }
            return storeService.getCategories();
        })
        .then((categories) => {
            viewData.categories = categories;
        })
        .catch((err) => {
            viewData.message = err;
        })
        .finally(() => {
            res.render('shop', viewData);
        });
});



app.get('/shop/:id', (req, res) => {
    const itemId = req.params.id;

    let viewData = {
        post: null,
        posts: [],
        categories: [],
        message: null,
        categoriesMessage: null
    };

    storeService.getPublishedItems()
        .then((posts) => {
            viewData.posts = posts;
            return storeService.getCategories();
        })
        .then((categories) => {
            viewData.categories = categories;
            return storeService.getAllItems();
        })
        .then((allItems) => {
            const item = allItems.find((item) => item.id == itemId);
            if (item) {
                viewData.post = item;
            } else {
                viewData.message = "Item not found.";
            }
        })
        .catch((err) => {
            viewData.message = "Error loading the requested item.";
        })
        .finally(() => {
            res.render('shop', viewData);
        });
});


app.get('/items', (req, res) => {
    const categoryFilter = req.query.category;

    storeService.getAllItems()
        .then((items) => {
            // Filter items if category is provided
            if (categoryFilter) {
                items = items.filter(item => item.category == categoryFilter);
            }

            // Render the items page with the filtered items
            res.render('items', { 
                title: 'Items', 
                items, 
                message: items.length ? null : 'No items found for this category.' 
            });
        })
        .catch(() => {
            res.render('items', { 
                title: 'Items', 
                items: [], 
                message: 'Error retrieving items.' 
            });
        });
});


app.get('/categories', (req, res) => {
    storeService.getCategories()
        .then((categories) => {
            res.render('categories', { 
                title: 'Categories', 
                categories 
            });
        })
        .catch(() => {
            res.render('categories', { 
                title: 'Categories', 
                categories: [], 
                message: 'No results' 
            });
        });
});

app.get('/items/add', (req, res) => {
    res.render('addItem', { title: 'Add Items' });
});

// Route for Adding a New Item with Cloudinary
app.post('/items/add', upload.single('featureImage'), (req, res) => {
    const processItem = (imageUrl) => {
        req.body.featureImage = imageUrl;
        storeService
            .addItem(req.body)
            .then(() => {
                res.redirect('/items');
            })
            .catch((err) => {
                res.status(500).json({ message: 'Failed to add item', error: err });
            });
    };

    if (req.file) {
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        streamUpload(req)
            .then((uploaded) => {
                processItem(uploaded.url);
            })
            .catch(() => {
                res.status(500).json({ message: 'Image upload failed' });
            });
    } else {
        processItem('');
    }
});

// Route to view the cart
app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { title: 'Your Cart', cartItems, total });
});

// Route for Adding Items to Cart
app.post('/cart/add', (req, res) => {
    if (!req.session.cart) req.session.cart = [];
    const { itemId, itemName, itemPrice } = req.body;

    const item = {
        id: parseInt(itemId, 10),
        name: itemName,
        price: parseFloat(itemPrice),
    };

    req.session.cart.push(item);
    res.redirect('/cart'); // Redirect to the cart page after adding an item
});


// Route for Checkout
app.post('/cart/checkout', (req, res) => {
    res.render('checkout', { message: 'Thank you for your purchase!' });
});

// Route for Viewing Cart
app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { cartItems, total });
});

app.get('/categories', (req, res) => {
    storeService.getCategories().then((categories) => {
        res.render('categories', { categories });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load categories', error: err });
    });
});


app.get('/category/:id', (req, res) => {
    const categoryId = parseInt(req.params.id, 10);

    storeService.getAllItems().then((items) => {
        const filteredItems = items.filter(item => item.category === categoryId);
        res.render('categoryProducts', { items: filteredItems });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load category products', error: err });
    });
});


app.use((req, res) => {
    res.status(404).render('404', { message: 'Page Not Found' });
});

storeService.initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}).catch(err => {
    console.log('Error initializing data:', err);
});
