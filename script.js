const form = document.getElementById('plant-form');
const plantList = document.getElementById('plant-list');

// API base
const API_BASE = 'http://localhost:5000/api';

// Keep data format the same as before (name, interval, lastWatered)
let plants = JSON.parse(localStorage.getItem('plants')) || [];

async function fetchPlantsFromServer() {
  try {
    const res = await fetch(`${API_BASE}/plants`);
    if (!res.ok) throw new Error('Server returned error');
    const data = await res.json();
    // If server returns an array (legacy) or an object wrapper
    const serverPlants = Array.isArray(data) ? data : (data.plants || []);
    if (serverPlants.length > 0) {
      // Map server objects to client format if needed
      plants = serverPlants.map(p => ({
        _id: p._id || p.id,
        name: p.name,
        interval: p.interval,
        lastWatered: p.lastWatered || new Date().toISOString()
      }));
      localStorage.setItem('plants', JSON.stringify(plants));
      updatePlantList();
      return true;
    }
  } catch (err) {
    // ignore, we'll use localStorage
  }
  return false;
}

function updatePlantList() {
  plantList.innerHTML = '';
  plants.forEach((plant, index) => {
    const nextWatering = new Date(plant.lastWatered);
    nextWatering.setDate(nextWatering.getDate() + parseInt(plant.interval));

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>🌿 ${plant.name}</strong><br/>
      Next watering: <em>${nextWatering.toDateString()}</em><br/>
      <button data-index="${index}" class="water-btn">💧 Water Today</button>
      <button data-index="${index}" class="delete-btn">🗑 Remove</button>
    `;
    plantList.appendChild(li);
  });

  // attach handlers
  document.querySelectorAll('.water-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      waterPlant(idx);
    });
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      deletePlant(idx);
    });
  });
}

async function waterPlant(index) {
  const plant = plants[index];
  plant.lastWatered = new Date().toISOString();
  // If plant has backend id, update server
  if (plant._id) {
    try {
      await fetch(`${API_BASE}/plants/${plant._id}/water`, { method: 'PUT' });
    } catch (err) {
      // ignore server error, still update locally
    }
  }
  saveAndUpdate();
}

async function deletePlant(index) {
  const plant = plants[index];
  // If plant has backend id, delete from server
  if (plant._id) {
    try {
      await fetch(`${API_BASE}/plants/${plant._id}`, { method: 'DELETE' });
    } catch (err) {
      // ignore
    }
  }
  plants.splice(index, 1);
  saveAndUpdate();
}

function saveAndUpdate() {
  localStorage.setItem('plants', JSON.stringify(plants));
  updatePlantList();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('plant-name').value;
  const interval = document.getElementById('watering-interval').value;
  const newPlant = {
    name,
    interval,
    lastWatered: new Date().toISOString()
  };

  // Try to save to backend, but don't change front-end format if server fails
  try {
    const res = await fetch(`${API_BASE}/plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlant)
    });
    if (res.ok) {
      const saved = await res.json();
      // saved contains _id, use it in local copy
      plants.push({ _id: saved._id, name: saved.name, interval: saved.interval, lastWatered: saved.lastWatered });
    } else {
      plants.push(newPlant);
    }
  } catch (err) {
    plants.push(newPlant);
  }

  saveAndUpdate();
  form.reset();
});

// on load, try server then fall back
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await fetchPlantsFromServer();
  if (!ok) updatePlantList();
});

// download and login functions unchanged
function download() {
  const confirmDownload = confirm("Do you want to download the PlantCare App?");
  if (confirmDownload) {
    const link = document.createElement("a");
    link.href = "PlantSchedulerApp.zip";
    link.download = "PlantSchedulerApp.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Download started!");
  } else {
    alert("Download cancelled.");
  }
}
function login(event) {
  event.preventDefault();
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;
  if (username === "admin" && password === "plant123") {
    const msg = document.getElementById("loginMessage");
    if (msg) {
      msg.style.color = "green";
      msg.innerText = "Login successful!";
    }
    setTimeout(() => { window.location.href = "download.html"; }, 1000);
  } else {
    const msg = document.getElementById("loginMessage");
    if (msg) {
      msg.style.color = "red";
      msg.innerText = "Invalid credentials!";
    }
  }
}