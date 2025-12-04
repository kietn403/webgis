
var map = L.map('map').setView([10.78, 106.7], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
let dataset = []; 

// Biến route và Marker cho Start/End
let startPoint = null, endPoint = null;
let startMarker = null, endMarker = null;
let routeLine = null, arrowLayer = null;
const searchResultsDiv = document.getElementById('searchResults');
let currentRouteMode = 'start'; 

function initApp() {
  fetchGeoJson(); 
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterLocations(e.target.value);
  });
  document.getElementById('myLocation').addEventListener('click', locateUser);
  document.querySelectorAll('.route-mode-btn').forEach(button => {
    button.addEventListener('click', function() {
      currentRouteMode = this.dataset.mode;
      document.querySelectorAll('.route-mode-btn').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });
  document.getElementById('clearRoute').addEventListener('click', clearRoute);
}

//  1. Hàm tạo nội dung Popup cho điểm di tích
function createPopupContent(properties, featureIndex) {
    const defaultImage = "https://via.placeholder.com/200x120?text=No+Image";
    const imageUrl = (properties.images && properties.images.length > 0) 
        ? properties.images[0] 
        : defaultImage;
    
    const rating = properties.rating ? properties.rating.toFixed(1) : 'Chưa có';
    const totalReviews = Array.isArray(properties.reviews) ? properties.reviews.length : 0;
    
    const item = dataset.find(d => d.index === featureIndex);
    const lat = item ? item.lat : 0;
    const lng = item ? item.lng : 0;

    return `
        <div class="popup-wrapper">
            <div class="popup-inner">
                <img src="${imageUrl}" alt="${properties.name}" class="popup-img">
                <div class="popup-body">
                    <div class="popup-title">${properties.name}</div>
                    <div class="popup-meta">Phường: ${properties.ten_xa} · Đánh giá: <span class="popup-rating">${rating}</span> ⭐ (${totalReviews} lượt)</div>
                    <div class="popup-atmos">${properties.atmosphere}</div>
                </div>
            </div>
            
            <div class="popup-actions">
                <button onclick="setPoint('start', ${lat}, ${lng})" class="route-btn-a">Đặt Điểm A</button>
                <button onclick="setPoint('end', ${lat}, ${lng})" class="route-btn-b">Đặt Điểm B</button>
            </div>

            <div class="popup-review-form-section">
                <form id="reviewForm_${featureIndex}" class="review-form">
                    <p><strong>Gửi Đánh Giá Của Bạn:</strong></p>
                    <input type="number" id="rating_${featureIndex}" min="1" max="5" placeholder="Điểm (1-5)" required>
                    <textarea id="comment_${featureIndex}" placeholder="Bình luận (Tùy chọn)..."></textarea>
                    <button type="submit">Gửi Đánh Giá</button>
                </form>
            </div>
        </div>
    `;
}

//  2. Xử lý Marker cho Route 
function createRouteMarker(latlng, type) { 
    if (type === 'start' && startMarker) map.removeLayer(startMarker);
    if (type === 'end' && endMarker) map.removeLayer(endMarker);
    
    const markerIcon = L.divIcon({
        className: 'route-marker',
        html: `<div style="background-color:${type === 'start' ? 'green' : 'red'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; text-align: center; color: white; font-weight: bold; line-height: 14px;">${type === 'start' ? 'A' : 'B'}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });

    const marker = L.marker(latlng, { icon: markerIcon });

    if (type === 'start') {
        startMarker = marker.addTo(map);
        startPoint = latlng;
    } else {
        endMarker = marker.addTo(map);
        endPoint = latlng;
    }

    marker.bindPopup(`<b>${type === 'start' ? 'Điểm Bắt Đầu' : 'Điểm Kết Thúc'}</b><br>Tọa độ: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`).openPopup();

    if(startPoint && endPoint) {
        calculateRoute(startPoint, endPoint);
    }
}

function setPoint(type, lat, lng) {
    createRouteMarker({ lat: lat, lng: lng }, type);

    currentRouteMode = (type === 'start' ? 'end' : 'start');
    document.querySelectorAll('.route-mode-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#mode${currentRouteMode === 'start' ? 'Start' : 'End'}`).classList.add('active');
}

// 3. Hàm vẽ GeoJSON lên bản đồ 
function renderGeoJson(geoJsonData) {
    if (window.geoJsonLayer) map.removeLayer(window.geoJsonLayer);
    
    let featuresWithValidCoord = [];
    dataset = geoJsonData.features.map((feature, index) => {
        const coordinates = feature && 
                            feature.geometry && 
                            Array.isArray(feature.geometry.coordinates) && 
                            feature.geometry.coordinates.length >= 2
                            ? feature.geometry.coordinates
                            : null; 
        

        const item = {
            ...feature.properties,
            index: index, 
            lat: coordinates ? coordinates[1] : null,
            lng: coordinates ? coordinates[0] : null
        };

        if (item.lat !== null && item.lng !== null) {
            featuresWithValidCoord.push(feature);
        }
        return item;

    }).filter(item => item.lat !== null && item.lng !== null);

    const validGeoJson = {
        "type": "FeatureCollection",
        "features": featuresWithValidCoord
    };


    const siteIcon = L.icon({
        iconUrl: 'data/red_marker_icon.png', 
        iconSize: [45, 60], 
        iconAnchor: [22, 75],
        popupAnchor: [1, -70] 
    });



    window.geoJsonLayer = L.geoJSON(validGeoJson, {
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, { icon: siteIcon }); 
        },
        onEachFeature: (feature, layer) => {
            const index = dataset.find(d => d.name === feature.properties.name)?.index;
            if (index === undefined) return; 

            const popupContent = createPopupContent(feature.properties, index);

            layer.bindPopup(popupContent, { maxWidth: 520, className: 'big-popup' });
            layer.on('popupopen', () => {
                const form = document.getElementById(`reviewForm_${index}`);
                if(form) {
                    form.onsubmit = (e) => submitReview(e, index);
                }
            });
        }
    }).addTo(map);

    if (window.geoJsonLayer.getBounds().isValid()) {
         map.fitBounds(window.geoJsonLayer.getBounds(), { padding: [50, 50] });
    }
   
    filterLocations('');
}


function locateUser() {
    map.locate({setView: true, maxZoom: 16});

    map.on('locationfound', function(e) {
        if (window.userMarker) map.removeLayer(window.userMarker);

        window.userMarker = L.marker(e.latlng).addTo(map)
            .bindPopup("Vị trí của bạn").openPopup();
        
        L.circle(e.latlng, e.accuracy).addTo(map);
    });

    map.on('locationerror', function(e) {
        alert("Không thể truy cập vị trí của bạn. Vui lòng kiểm tra quyền truy cập GPS.");
        console.error("Lỗi định vị:", e.message);
    });
}


map.on('click', function(e) {
    const latlng = e.latlng;
    setPoint(currentRouteMode, latlng.lat, latlng.lng);
});

async function fetchGeoJson() { 
    try {
        const response = await fetch('/api/geojson');
        const data = await response.json();
        if (data && data.features) {
            renderGeoJson(data);
        } else {
            console.error("Lỗi: GeoJSON không có trường 'features' hợp lệ.");
        }
    } catch (error) {
        console.error("Lỗi khi fetch GeoJSON:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchGeoJson(); 

    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterLocations(e.target.value);
    });
    
    document.getElementById('myLocation').addEventListener('click', locateUser);
    
    document.querySelectorAll('.route-mode-btn').forEach(button => {
        button.addEventListener('click', function() {
            currentRouteMode = this.dataset.mode;
            document.querySelectorAll('.route-mode-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.getElementById('clearRoute').addEventListener('click', clearRoute);
});

function filterLocations(query) { 
    searchResultsDiv.innerHTML = '';
    const filtered = dataset.filter(item => 
        (item.name && item.name.toLowerCase().includes(query.toLowerCase())) || 
        (item.ten_xa && item.ten_xa.toLowerCase().includes(query.toLowerCase()))
    );

    if (filtered.length === 0 && query.length > 0) {
        searchResultsDiv.innerHTML = '<div style="padding: 10px; color: gray;">Không tìm thấy kết quả.</div>';
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-item'; 
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.ten_xa}</small>
            </div>
            <div class="route-btns">
                <button onclick="setPoint('start', ${item.lat}, ${item.lng})">A</button>
                <button onclick="setPoint('end', ${item.lat}, ${item.lng})">B</button>
            </div>
        `;
        div.onclick = (event) => {

            if (event.target.tagName === 'BUTTON') return;
            map.setView([item.lat, item.lng], 16);
            const feature = window.geoJsonLayer.getLayers().find(l => 
                l.feature && l.feature.properties && l.feature.properties.name === item.name
            );
            if (feature) feature.openPopup();
        };
        searchResultsDiv.appendChild(div);
    });
}

async function calculateRoute(start, end) { 
    const mode = document.getElementById('transportMode').value;
    const url = `https://router.project-osrm.org/route/v1/${mode}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    
    try {
        const res = await fetch(url);
        const json = await res.json();

        if(json.routes && json.routes.length > 0) {
            const route = json.routes[0];

            if(routeLine) map.removeLayer(routeLine);
            if(arrowLayer) map.removeLayer(arrowLayer);

            routeLine = L.geoJSON(route.geometry, { 
                color: "#0077ff", 
                weight: 5,
                opacity: 0.7 
            }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

            arrowLayer = L.polylineDecorator(routeLine, {
                patterns: [{
                    offset: '5%',
                    repeat: '10%',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 12,
                        polygon: false,
                        pathOptions: { color: "#0055cc", weight: 2 }
                    })
                }]
            }).addTo(map);

            let km = (route.distance / 1000).toFixed(2);
            let min = (route.duration / 60).toFixed(1);
            document.getElementById('routeInfo').innerHTML = `
                <strong>Quãng đường:</strong> ${km} km <br>
                <strong>Thời gian ước tính:</strong> ${min} phút
            `;
        } else {
             document.getElementById('routeInfo').innerHTML = 'Không tìm thấy tuyến đường.';
        }

    } catch (error) {
        console.error("Lỗi khi tính toán route:", error);
        document.getElementById('routeInfo').innerHTML = 'Lỗi kết nối Route Server.';
    }
}

function clearRoute() { 
    if(startMarker) map.removeLayer(startMarker);
    if(endMarker) map.removeLayer(endMarker);
    if(routeLine) map.removeLayer(routeLine);
    if(arrowLayer) map.removeLayer(arrowLayer);
    
    startPoint = endPoint = null;
    startMarker = endMarker = null;
    routeLine = arrowLayer = null;

    document.getElementById('routeInfo').innerHTML = '';
    currentRouteMode = 'start';
    document.querySelectorAll('.route-mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('modeStart').classList.add('active');
}

async function submitReview(e, featureIndex) { 
    e.preventDefault();
    const form = e.target;
    const rating = document.getElementById(`rating_${featureIndex}`).value;
    const comment = document.getElementById(`comment_${featureIndex}`).value;

    if (!rating) {
        alert('Vui lòng nhập điểm đánh giá (1-5).');
        return;
    }

    const reviewData = {
        review: {
            rating: parseInt(rating),
            comment: comment
        }
    };

    try {
        const response = await fetch(`/api/review/${featureIndex}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });

        const result = await response.json();
        if(result.success) {
            alert(`Đánh giá thành công! Điểm trung bình mới: ${result.newRating} ⭐`);
            map.closePopup();
            form.reset(); 
            fetchGeoJson(); 
        } else {
            alert(`Lỗi khi gửi đánh giá: ${result.error}`);
        }
    } catch (error) {
        console.error('Lỗi network/server:', error);
        alert('Lỗi kết nối, không thể gửi đánh giá.');
    }
}