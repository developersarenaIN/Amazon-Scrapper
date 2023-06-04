const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

const blockedUrls = [
    'audible.com',
    'bookdepository.com',
    'comixology.com',
    'dpreview.com',
    'fabric.com',
    'goodreads.com',
    'imdb.com',
    'shopbop.com',
    'woot.com',
    'zappos.com',
    'eero.com',
    'pillpack.com',
    'amazon.in',
    'amazon.jobs',
    'blog.aboutamazon.com',
    'aboutamazon.com',
    'amazon.com',
    'amazon.science',
    'services.amazon.com',
    'amazon-business.html',
    'developer.amazon.com',
    'affiliate-program.amazon.com',
    'advertising.amazon.com',
    'go.thehub-amazon.com',
    '6pm.com',
    'abebooks.com',
    'acx.com',
    'sell.amazon.com',
    'ignite.amazon.com',
    'aws.amazon.com',
    'kdp.amazon.com',
    'videodirect.amazon.com',
    'ring.com',
    'shop.ring.com'
];

app.get('/scrape', (req, res) => {
    const scraperApiKey = req.query.api_key;
    if (!scraperApiKey) {
        res.status(400).send('Missing Scraper API Key');
        return;
    }

    const keyword = req.query.keyword || 'Beauty';
    const pageNumber = req.query.page || 1;

    const url = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=https://www.amazon.com/s?k=${keyword}&page=${pageNumber}`;

    axios
        .get(url)
        .then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);
            const products = [];
            const duplicates = new Set();
            let duplicatesCount = 0;

            $('.s-result-item').each((index, element) => {
                const linkElement = $(element).find('h2 a');
                const link = linkElement.attr('href');
                const title = linkElement.text().trim();
                if (
                    link &&
                    !link.includes('/s?k=') &&
                    !link.includes('customer') &&
                    !link.includes('team') &&
                    !link.includes('nav') &&
                    !link.includes('order') &&
                    !link.includes('signin') &&
                    !link.includes('void') &&
                    !link.includes('/gp') &&
                    !blockedUrls.some((blockedUrl) => link.includes(blockedUrl)) &&
                    !(title && title.includes('ref=s'))
                ) {
                    const fullLink = 'https://www.amazon.com' + link;
                    const keyword = fullLink.split('/dp/')[0];

                    if (!duplicates.has(keyword)) {
                        const product = { title, link: fullLink };

                        // Scrape the price
                        const priceElement = $(element).find('.a-price .a-offscreen');
                        const price = priceElement.first().text().trim();
                        if (price) {
                            product.price = price;
                        }

                        // Scrape additional details
                        const asin = $(element).data('asin');
                        const ratings = $(element).find('.sg-col-inner .a-icon-alt').first().text().trim();
                        const customerReviewsElement = $(element).find('.sg-col-inner .a-size-base:nth-child(4)');
                        const customerReviews = customerReviewsElement.text().trim();
                        const reviewCount = customerReviews.match(/\d+/);

                        if (asin) {
                            product.asin = asin;
                        }
                        if (ratings) {
                            product.ratings = ratings;
                        }
                        if (customerReviews) {
                            product.customerReviews = customerReviews;
                        }
                        if (reviewCount) {
                            product.reviewCount = reviewCount[0];
                        }

                        products.push(product);
                        duplicates.add(keyword);
                    } else {
                        duplicatesCount++;
                    }
                }
            });

            res.json({ count: products.length, duplicatesRemoved: duplicatesCount, products });
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send('Error occurred while scraping the website');
        });
});

app.get('/scrape-external', (req, res) => {
    const url = req.query.url;
    if (!url) {
        res.status(400).send('Missing URL parameter');
        return;
    }

    const scraperApiKey = req.query.api_key;
    if (!scraperApiKey) {
        res.status(400).send('Missing Scraper API Key');
        return;
    }

    const scraperApiUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${url}`;

    axios
        .get(scraperApiUrl)
        .then((response) => {
            res.send(response.data);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send('Error occurred while scraping the website');
        });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
