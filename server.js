const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect('mongodb://localhost:27017/planta')
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!', error: err.message });
});

// Serve frontend static files from project root
app.use(express.static(path.join(__dirname)));

const Plant = require('./models/Plant');
const Schedule = require('./models/Schedule');

// Scheduler Routes
// Get all schedules
app.get('/api/schedules', async (req, res) => {
  try {
    console.log('Fetching all schedules...'); // Debug log
    const schedules = await Schedule.find().populate('plantId');
    console.log('Found schedules:', schedules); // Debug log
    res.json({
      success: true,
      count: schedules.length,
      schedules: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error); // Debug log
    res.status(500).json({ message: 'Error fetching schedules', error: error.message });
  }
});

// Get schedule by plant ID
app.get('/api/schedules/plant/:plantId', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ plantId: req.params.plantId }).populate('plantId');
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedule', error: error.message });
  }
});

// Create new schedule
app.post('/api/schedules', async (req, res) => {
  try {
    const { plantId, userId, wateringDays, wateringTime, notifications } = req.body;
    console.log('Received schedule data:', req.body); // Debug log

    // Validate input
    if (!wateringDays || !wateringTime) {
      return res.status(400).json({ message: 'Watering days and time are required' });
    }

    // If plantId is not provided, create a schedule without plant reference
    let schedule = new Schedule({
      userId: userId || 'default',
      wateringDays,
      wateringTime,
      notifications,
      nextWateringDate: new Date() // Will be updated by pre-save hook
    });

    if (plantId) {
      // If plantId is provided, validate and add it
      const plant = await Plant.findById(plantId);
      if (!plant) {
        return res.status(404).json({ message: 'Plant not found' });
      }
      schedule.plantId = plantId;
    }

    console.log('Saving schedule:', schedule); // Debug log
    const savedSchedule = await schedule.save();
    console.log('Saved schedule:', savedSchedule); // Debug log
    res.status(201).json(savedSchedule);
  } catch (error) {
    console.error('Error saving schedule:', error); // Debug log
    res.status(500).json({ message: 'Error creating schedule', error: error.message });
  }
});

// Update schedule
app.put('/api/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error updating schedule', error: error.message });
  }
});

// Delete schedule
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error: error.message });
  }
});

// Toggle schedule active status
app.patch('/api/schedules/:id/toggle', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    schedule.isActive = !schedule.isActive;
    const updatedSchedule = await schedule.save();
    res.json(updatedSchedule);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling schedule', error: error.message });
  }
});

// GET all plants
app.get('/api/plants', async (req, res) => {
  try {
    const plants = await Plant.find();
    res.json(plants);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plants', error: error.message });
  }
});

// POST a new plant
app.post('/api/plants', async (req, res) => {
  try {
    const { name, interval } = req.body;
    
    // Validate input
    if (!name || !interval) {
      return res.status(400).json({ message: 'Name and interval are required' });
    }
    
    if (isNaN(interval) || interval <= 0) {
      return res.status(400).json({ message: 'Interval must be a positive number' });
    }

    const plant = new Plant({
      name: name.trim(),
      interval: parseInt(interval),
      lastWatered: new Date()
    });
    
    const savedPlant = await plant.save();
    res.status(201).json(savedPlant);
  } catch (error) {
    res.status(500).json({ message: 'Error creating plant', error: error.message });
  }
});

// PUT: water a plant
app.put('/api/plants/:id/water', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }
    
    plant.lastWatered = new Date();
    const updatedPlant = await plant.save();
    res.json(updatedPlant);
  } catch (error) {
    res.status(500).json({ message: 'Error updating plant', error: error.message });
  }
});

// DELETE a plant
app.delete('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findByIdAndDelete(req.params.id);
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }
    res.json({ message: 'Plant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting plant', error: error.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
