const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "1000mb", extended: true }));
app.use(cors());

// For Vercel deployment, we need to use different file paths
const isVercel = process.env.VERCEL === '1';
const baseDir = isVercel ? path.join('/tmp') : __dirname;

// File paths - store in /tmp on Vercel for write access
const dataFilePath = path.join(baseDir, 'gold.json');
const animalFilePath = path.join(baseDir, 'animal.json');
const cropsFilePath = path.join(baseDir, 'crops.json');
const kccdataFilePath = path.join(baseDir, 'kccdata.json');
const kccahdataFilePath = path.join(baseDir, 'kccahdata.json');

// Initialize files if they don't exist (for Vercel)
const initializeFiles = async () => {
  try {
    if (isVercel) {
      console.log('Initializing files in /tmp directory for Vercel');
      const files = [
        { path: dataFilePath, initialData: [] },
        { path: animalFilePath, initialData: [] },
        { path: cropsFilePath, initialData: [] },
        { path: kccdataFilePath, initialData: [] },
        { path: kccahdataFilePath, initialData: [] }
      ];
      
      for (const file of files) {
        if (!await fs.pathExists(file.path)) {
          await fs.writeJson(file.path, file.initialData, { spaces: 2 });
          console.log(`Created ${file.path}`);
        } else {
          console.log(`${file.path} already exists`);
        }
      }
    } else {
      // For local development, ensure the components/data directory exists
      const dataDir = path.join(__dirname, 'components', 'data');
      if (!await fs.pathExists(dataDir)) {
        await fs.mkdirp(dataDir);
        console.log('Created components/data directory');
      }
      
      // Initialize files with empty arrays if they don't exist
      const localFiles = [
        { path: path.join(__dirname, 'components', 'data', 'gold.json'), initialData: [] },
        { path: path.join(__dirname, 'components', 'data', 'animal.json'), initialData: [] },
        { path: path.join(__dirname, 'components', 'data', 'crops.json'), initialData: [] },
        { path: path.join(__dirname, 'components', 'data', 'kccdata.json'), initialData: [] },
        { path: path.join(__dirname, 'components', 'data', 'kccahdata.json'), initialData: [] }
      ];
      
      for (const file of localFiles) {
        if (!await fs.pathExists(file.path)) {
          await fs.writeJson(file.path, file.initialData, { spaces: 2 });
          console.log(`Created ${file.path}`);
        }
      }
    }
    console.log('File initialization complete');
  } catch (error) {
    console.error('Error initializing files:', error);
  }
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Configure multer for file uploads (memory storage for Vercel)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ================= KCC AH DATA ROUTES =================
app.get('/api/kccahdata', async (req, res) => {
  try {
    console.log("GET /api/kccahdata hit");
    const data = await fs.readJson(kccahdataFilePath);
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Error reading data' });
  }
});

app.post('/api/kccahdata', async (req, res) => {
  try {
    const newData = req.body;

    console.log('🗑️  Deleting old JSON data and writing new data...');

    // Directly write the new data (no reading/parsing)
    await fs.writeJson(kccahdataFilePath, newData, { spaces: 2 });

    console.log('✅ New data written to kccahdata.json');
    res.status(201).json({ message: 'Data overwritten successfully.' });
  } catch (error) {
    console.error('❌ Error saving data:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// ================= KCC DATA ROUTES =================
app.get('/api/kccdata', async (req, res) => {
  try {
    console.log("GET /api/kccdata hit");
    const data = await fs.readJson(kccdataFilePath);
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Error reading data' });
  }
});

app.post('/api/kccdata', async (req, res) => {
  try {
    const newData = req.body;

    console.log('🗑️  Deleting old JSON data and writing new data...');

    // Directly write the new data (no reading/parsing)
    await fs.writeJson(kccdataFilePath, newData, { spaces: 2 });

    console.log('✅ New data written to kccdata.json');
    res.status(201).json({ message: 'Data overwritten successfully.' });
  } catch (error) {
    console.error('❌ Error saving data:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// ================= GOLD ROUTES =================
app.get('/api/gold', async (req, res) => {
  try {
    const data = await fs.readJson(dataFilePath);
    res.json(data);
  } catch (err) {
    console.error('Error reading gold data:', err);
    res.status(500).json({ error: 'Failed to read gold data' });
  }
});

app.post('/api/gold', async (req, res) => {
  try {
    const newRecord = req.body;
    let data = [];
    if (await fs.pathExists(dataFilePath)) {
      data = await fs.readJson(dataFilePath);
    }
    const maxId = data.reduce((max, item) => (item.id > max ? item.id : max), 0);
    newRecord.id = maxId + 1;
    data.push(newRecord);
    await fs.writeJson(dataFilePath, data, { spaces: 2 });
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Failed to save gold data' });
  }
});

app.put('/api/gold/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedRecord = req.body;
    const data = await fs.readJson(dataFilePath);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }
    updatedRecord.id = id;
    data[index] = updatedRecord;
    await fs.writeJson(dataFilePath, data, { spaces: 2 });
    res.json(updatedRecord);
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.delete('/api/gold/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await fs.readJson(dataFilePath);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }
    data.splice(index, 1);
    await fs.writeJson(dataFilePath, data, { spaces: 2 });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Error deleting data:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ================= ANIMAL ROUTES =================
app.get('/api/animal', async (req, res) => {
  try {
    const data = await fs.readJson(animalFilePath);
    res.json(data);
  } catch (err) {
    console.error('Error reading animal data:', err);
    res.status(500).json({ error: 'Failed to read animal data' });
  }
});

app.post('/api/animal', async (req, res) => {
  try {
    const newRecord = req.body;
    let data = [];
    if (await fs.pathExists(animalFilePath)) {
      data = await fs.readJson(animalFilePath);
    }
    const maxId = data.reduce((max, item) => (item.id > max ? item.id : max), 0);
    newRecord.id = maxId + 1;
    data.push(newRecord);
    await fs.writeJson(animalFilePath, data, { spaces: 2 });
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error saving animal data:', err);
    res.status(500).json({ error: 'Failed to save animal data' });
  }
});

app.put('/api/animal/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedRecord = req.body;
    const data = await fs.readJson(animalFilePath);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Animal record not found' });
    }
    updatedRecord.id = id;
    data[index] = updatedRecord;
    await fs.writeJson(animalFilePath, data, { spaces: 2 });
    res.json(updatedRecord);
  } catch (err) {
    console.error('Error updating animal data:', err);
    res.status(500).json({ error: 'Failed to update animal record' });
  }
});

app.delete('/api/animal/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await fs.readJson(animalFilePath);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Animal record not found' });
    }
    data.splice(index, 1);
    await fs.writeJson(animalFilePath, data, { spaces: 2 });
    res.json({ message: 'Animal record deleted successfully' });
  } catch (err) {
    console.error('Error deleting animal data:', err);
    res.status(500).json({ error: 'Failed to delete animal record' });
  }
});

// ================= CROPS ROUTES =================
app.get('/api/crops', async (req, res) => {
  try {
    const data = await fs.readJson(cropsFilePath);
    res.json(data);
  } catch (err) {
    console.error('Error reading crop data:', err);
    res.status(500).json({ error: 'Failed to read crop data' });
  }
});

app.post('/api/crops', async (req, res) => {
  try {
    const newRecord = req.body;
    let data = [];
    if (await fs.pathExists(cropsFilePath)) {
      data = await fs.readJson(cropsFilePath);
    }
    const maxId = data.reduce((max, item) => (item.crop_code > max ? item.crop_code : max), 0);
    newRecord.crop_code = maxId + 1;
    data.push(newRecord);
    await fs.writeJson(cropsFilePath, data, { spaces: 2 });
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error saving crop data:', err);
    res.status(500).json({ error: 'Failed to save crop data' });
  }
});

app.put('/api/crops/:id', async (req, res) => {
  try {
    const crop_code = parseInt(req.params.id);
    const updatedRecord = req.body;
    const data = await fs.readJson(cropsFilePath);
    const index = data.findIndex(item => item.crop_code === crop_code);
    if (index === -1) {
      return res.status(404).json({ error: 'Crop record not found' });
    }
    updatedRecord.crop_code = crop_code;
    data[index] = updatedRecord;
    await fs.writeJson(cropsFilePath, data, { spaces: 2 });
    res.json(updatedRecord);
  } catch (err) {
    console.error('Error updating crop data:', err);
    res.status(500).json({ error: 'Failed to update crop record' });
  }
});

app.delete('/api/crops/:id', async (req, res) => {
  try {
    const crop_code = parseInt(req.params.id);
    const data = await fs.readJson(cropsFilePath);
    const index = data.findIndex(item => item.crop_code === crop_code);
    if (index === -1) {
      return res.status(404).json({ error: 'Crop record not found' });
    }
    data.splice(index, 1);
    await fs.writeJson(cropsFilePath, data, { spaces: 2 });
    res.json({ message: 'Crop record deleted successfully' });
  } catch (err) {
    console.error('Error deleting crop data:', err);
    res.status(500).json({ error: 'Failed to delete crop record' });
  }
});

// ================= SUPABASE FORM SUBMIT =================
app.post("/submit-user-data", async (req, res) => {
  const {
    "உ_எண்": userId,
    "பெயர்": userName,
    "ஆதார்_எண்": aadhaar,
    userjson,
    loantype,
    isUpdate,
  } = req.body;

  console.log("📥 Incoming data:", {
    userId,
    userName,
    aadhaar,
    loantype,
    isUpdate,
  });

  try {
    let response;

    if (isUpdate) {
      // ✅ Step 1: Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("user_details")
        .select("id")
        .eq('"உ_எண்"', userId) // ✅ FIXED: Use .eq with Tamil column
        .single();

      if (fetchError || !existingUser) {
        console.error("❌ User not found for update:", fetchError || "No matching row");
        return res.status(404).json({
          message: "User not found for update",
          error: fetchError || "No user with matching உ_எண்",
        });
      }

      // ✅ Step 2: Update user
      const { data, error } = await supabase
        .from("user_details")
        .update({
          "பெயர்": userName,
          "ஆதார்_எண்": aadhaar,
          userjson,
          loantype,
        })
        .eq('"உ_எண்"', userId); // ✅ FIXED
     console.log("உ_எண்");
      if (error) {
        console.error("❌ Supabase Update Error:", error);
        return res.status(500).json({ message: "Update failed", error });
      }

      response = { message: "✅ Data updated successfully", data };
    } else {
      // ➕ Insert new user
      const { data, error } = await supabase
        .from("user_details")
        .insert([
          {
            "உ_எண்": userId,
            "பெயர்": userName,
            "ஆதார்_எண்": aadhaar,
            userjson,
            loantype,
          },
        ]);

      if (error) {
        console.error("❌ Supabase Insert Error:", error);
        return res.status(500).json({ message: "Insert failed", error });
      }

      response = { message: "✅ Data inserted successfully", data };
    }

    // ✅ Final response
    res.status(200).json(response);
  } catch (err) {
    console.error("❌ Server crash error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= GET USER BY ID =================
app.post("/get-user-by-id", async (req, res) => {
  try {
    const { userId } = req.body;

    // Use double quotes around the Tamil column name
    const { data, error } = await supabase
      .from("user_details")
      .select("userjson")
      .eq('"உ_எண்"', userId) // Notice the double quotes around column name
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ userjson: data.userjson });

  } catch (err) {
    console.error("Supabase error:", err);
    return res.status(500).json({ 
      error: "Database error",
      details: err.message 
    });
  }
});

// ================= GET ALL USERS =================
app.get("/get-all-usersAH", async (req, res) => {
  try {
    const { loantype } = req.query;

    // 1. Base query (always fetch all columns for debugging)
    let query = supabase
      .from("user_details")
      .select('*', { count: 'exact' }); // Include total count

    // 2. Case-insensitive KCC filter (if requested)
    if (loantype && loantype.toLowerCase() === 'kccah') {
      query = query.ilike('loantype', 'kccah'); // Case-insensitive search
    }

    // 3. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase Error:', { 
        message: error.message, 
        details: error.details 
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }

    // 4. Log results for debugging
    console.log(`Fetched ${count} records`, { 
      filters: { loantype },
      firstRecord: data?.[0] 
    });

    // 5. Return data (empty array if no results)
    res.json({ 
      success: true, 
      users: data || [],
      total: count || 0 
    });

  } catch (err) {
    console.error('Server Crash:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server crashed. Check logs.' 
    });
  }
});

app.get("/get-all-users", async (req, res) => {
  try {
    const { loantype } = req.query;

    // 1. Base query (always fetch all columns for debugging)
    let query = supabase
      .from("user_details")
      .select('*', { count: 'exact' }); // Include total count

    // 2. Case-insensitive KCC filter (if requested)
    if (loantype && loantype.toLowerCase() === 'kcc') {
      query = query.ilike('loantype', 'kcc'); // Case-insensitive search
    }

    // 3. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase Error:', { 
        message: error.message, 
        details: error.details 
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }

    // 4. Log results for debugging
    console.log(`Fetched ${count} records`, { 
      filters: { loantype },
      firstRecord: data?.[0] 
    });

    // 5. Return data (empty array if no results)
    res.json({ 
      success: true, 
      users: data || [],
      total: count || 0 
    });

  } catch (err) {
    console.error('Server Crash:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server crashed. Check logs.' 
    });
  }
});

// ================= ID BASED SEARCH =================
app.get("/api/user-data/:uNumber", async (req, res) => {
  const { uNumber } = req.params;
  console.log("📥 Fetching user for உ_எண்:", uNumber);

  try {
    const { data, error } = await supabase
      .from('user_details')
      .select('*')
      .eq('"உ_எண்"', uNumber)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ message: 'சேமிப்பக பிழை', details: error.message });
    }

    if (!data) {
      console.log("ℹ️ No matching user found.");
      return res.status(404).json({ message: 'பயனர் கிடைக்கவில்லை' });
    }

    // Check if user has KCC loan type
    if (data.loantype && data.loantype !== "KCC") {
      return res.status(400).json({ message: 'இந்த உ_எண் NO IN KCC ' });
    }

    console.log("✅ KCC User data retrieved:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("🔥 Unexpected error:", err);
    res.status(500).json({ message: 'உள் சேவையக பிழை', error: err.toString() });
  }
});

app.get("/api/user-data-kccah/:uNumber", async (req, res) => {
  const { uNumber } = req.params;
  console.log("📥 Fetching user for உ_எண்:", uNumber);

  try {
    const { data, error } = await supabase
      .from('user_details')
      .select('*')
      .eq('"உ_எண்"', uNumber)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ message: 'சேமிப்பக பிழை', details: error.message });
    }

    if (!data) {
      console.log("ℹ️ No matching user found.");
      return res.status(404).json({ message: 'பயனர் கிடைக்கவில்லை' });
    }

    // Check if user has KCC loan type
    if (data.loantype && data.loantype !== "KCCAH") {
      return res.status(400).json({ message: 'இந்த உ_எண் NO IN KCCAH ' });
    }

    console.log("✅ KCCAH User data retrieved:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("🔥 Unexpected error:", err);
    res.status(500).json({ message: 'உள் சேவையக பிழை', error: err.toString() });
  }
});

// ================= FILE UPLOAD ENDPOINT =================
app.post('/api/upload/:docType', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // For Vercel deployment, we can't save files permanently
    // In a real application, you would upload to cloud storage (S3, Supabase Storage, etc.)
    const { docType } = req.params;
    
    // Simulate successful upload (in production, you would save to cloud storage)
    const fileUrl = `https://example.com/uploads/${Date.now()}-${req.file.originalname}`;
    
    res.json({
      message: `${docType} uploaded successfully (simulated for Vercel)`,
      path: fileUrl,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ================= HEALTH CHECK ENDPOINT =================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ================= FALLBACK ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ================= INITIALIZE AND START SERVER =================
const startServer = async () => {
  try {
    await initializeFiles();
    
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for Vercel serverless functions
module.exports = app;