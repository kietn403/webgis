
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const GEOJSON_PATH = path.join(__dirname, 'data/map.geojson'); 
app.use(express.static(path.join(__dirname)));
app.get('/api/geojson', (req, res) => {
  fs.readFile(GEOJSON_PATH, 'utf8', (err, data) => {
    if (err) {
        console.error("Lỗi khi đọc GeoJSON:", err);
        return res.status(200).json({ "type": "FeatureCollection", "features": [] });
    }
    try {
        const geo = JSON.parse(data);
        return res.json(geo);
    } catch (e) {
        console.error("Lỗi khi parse GeoJSON:", e);
        return res.status(500).json({ error: 'Lỗi định dạng GeoJSON trên server.' });
    }
  });
});


app.post('/api/review/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const body = req.body;
    
    fs.readFile(GEOJSON_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Cannot read file' });

        let geo;
        try {
            geo = JSON.parse(data);
        } catch (e) {
            return res.status(500).json({ error: 'Invalid GeoJSON' });
        }
        
        if (id < 0 || id >= geo.features.length) {
            return res.status(400).json({ error: 'invalid id/index' });
        }

        const feat = geo.features[id];
        if (!feat.properties) feat.properties = {};

        if (!Array.isArray(feat.properties.reviews)) feat.properties.reviews = [];
        feat.properties.reviews.push({
            rating: body.review.rating || null,
            comment: body.review.comment || '',
            author: body.review.author || 'Anonymous',
            time: new Date().toISOString()
        });

        if (body.review.rating) {
            const ratings = feat.properties.reviews
                .map(r => r.rating)
                .filter(v => typeof v === 'number');
            if (ratings.length) {
                const avg = ratings.reduce((a,b)=>a+b,0)/ratings.length;
                feat.properties.rating = Math.round(avg*10)/10;
            }
        }

        fs.writeFile(GEOJSON_PATH + '.tmp', JSON.stringify(geo, null, 2), err2 => {
            if (err2) return res.status(500).json({ error: 'Cannot write tmp' });
            fs.rename(GEOJSON_PATH + '.tmp', GEOJSON_PATH, err3 => {
                if (err3) return res.status(500).json({ error: 'Cannot rename file' });
                res.json({ success: true, newRating: feat.properties.rating });
            });
        });
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});