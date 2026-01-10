import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { csvPropertyImporter } from '../services/csvPropertyImporter';
import { kagglePropertyImporter } from '../services/kagglePropertyImporter';
import { multiDatasetImporter } from '../services/multiDatasetImporter';

const router = express.Router();

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'csv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * POST /api/csv-import/upload
 * Upload and import CSV file from data.gov.my or other sources
 */
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No CSV file uploaded' 
      });
    }

    const source = req.body.source || 'data.gov.my';
    const filePath = req.file.path;

    console.log(`📂 Processing uploaded CSV: ${req.file.originalname}`);
    console.log(`📍 File path: ${filePath}`);
    console.log(`📊 Source: ${source}`);

    // Import the CSV file
    const results = await csvPropertyImporter.importCSVFile(filePath, source);

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Cleaned up uploaded file: ${filePath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup file: ${cleanupError}`);
    }

    res.json({
      success: true,
      message: 'CSV import completed successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        errors: results.errors.slice(0, 10) // Return first 10 errors only
      }
    });

  } catch (error) {
    console.error('❌ CSV import error:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during CSV import'
    });
  }
});

/**
 * POST /api/csv-import/url
 * Import CSV from a direct URL (e.g., data.gov.my dataset URL)
 */
router.post('/url', async (req, res) => {
  try {
    const { csvUrl, source = 'data.gov.my' } = req.body;

    if (!csvUrl) {
      return res.status(400).json({
        success: false,
        error: 'CSV URL is required'
      });
    }

    console.log(`🌐 Importing CSV from URL: ${csvUrl}`);

    // Download CSV file
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.statusText}`);
    }

    const csvContent = await response.text();
    
    // Save to temporary file
    const tempDir = path.join(process.cwd(), 'uploads', 'csv');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFileName = `url_import_${Date.now()}.csv`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

    // Import the CSV file
    const results = await csvPropertyImporter.importCSVFile(tempFilePath, source);

    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup temp file: ${cleanupError}`);
    }

    res.json({
      success: true,
      message: 'CSV import from URL completed successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        errors: results.errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ CSV URL import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during CSV URL import'
    });
  }
});

/**
 * GET /api/csv-import/sample
 * Download a sample CSV template for property data
 */
router.get('/sample', (req, res) => {
  const sampleCSV = `title,property_type,price,bedrooms,bathrooms,square_feet,address,city,state,postal_code,latitude,longitude,listing_type,tenure
Modern Condominium,condominium,2500,3,2,1200,"123 Jalan Ampang, KLCC",Kuala Lumpur,Kuala Lumpur,50450,3.1570,101.7123,rent,freehold
Luxury Apartment,apartment,3000,2,2,900,"456 Jalan PJU, Damansara",Petaling Jaya,Selangor,47800,3.1319,101.6841,rent,leasehold
Family House,house,4500,4,3,1800,"789 Jalan USJ, Subang Jaya",Subang Jaya,Selangor,47600,3.0733,101.5185,sale,freehold`;

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="property_import_sample.csv"'
  });
  
  res.send(sampleCSV);
});

/**
 * POST /api/csv-import/test-sample
 * Import the sample KL properties CSV for testing
 */
router.post('/test-sample', async (req, res) => {
  try {
    const sampleFilePath = 'sample_kl_properties.csv';
    
    if (!fs.existsSync(sampleFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'Sample CSV file not found. Please ensure sample_kl_properties.csv exists in the project root.'
      });
    }

    console.log(`🧪 Testing CSV import with sample file: ${sampleFilePath}`);
    
    // Import the sample CSV file
    const results = await csvPropertyImporter.importCSVFile(sampleFilePath, 'sample_test');

    res.json({
      success: true,
      message: 'Sample CSV import completed successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        errors: results.errors,
        note: 'Properties are now available in search dropdown when typing 3+ characters'
      }
    });

  } catch (error) {
    console.error('❌ Sample CSV import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sample CSV import'
    });
  }
});

/**
 * POST /api/csv-import/kaggle-malaysia
 * Import the real Kaggle Malaysia property dataset (2,000 properties)
 */
router.post('/kaggle-malaysia', async (req, res) => {
  try {
    const kaggleFilePath = 'malaysia_house_price_data_2025.csv';
    
    if (!fs.existsSync(kaggleFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'Kaggle dataset not found. Please ensure malaysia_house_price_data_2025.csv exists in the project root.'
      });
    }

    console.log(`🏠 Importing real Malaysian property data from Kaggle: ${kaggleFilePath}`);
    
    // Import the Kaggle dataset (KL/Selangor only)
    const results = await kagglePropertyImporter.importKaggleCSV(kaggleFilePath);

    res.json({
      success: true,
      message: 'Kaggle Malaysia property dataset imported successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        errors: results.errors,
        note: `${results.imported} KL/Selangor properties now available in search dropdown when typing 3+ characters`
      }
    });

  } catch (error) {
    console.error('❌ Kaggle dataset import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Kaggle dataset import'
    });
  }
});

/**
 * POST /api/csv-import/mudah-rentals
 * Import Mudah KL/Selangor rental properties (19,992 records)
 */
router.post('/mudah-rentals', async (req, res) => {
  try {
    const mudahFilePath = 'mudah-apartment-kl-selangor.csv';
    
    if (!fs.existsSync(mudahFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'Mudah rental dataset not found. Please ensure mudah-apartment-kl-selangor.csv exists.'
      });
    }

    console.log(`🏠 Importing Mudah rental properties: ${mudahFilePath}`);
    
    const results = await multiDatasetImporter.importMudahRentals(mudahFilePath);

    res.json({
      success: true,
      message: 'Mudah rental properties imported successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        note: `${results.imported} rental properties now searchable in dropdown`
      }
    });

  } catch (error) {
    console.error('❌ Mudah rental import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Mudah rental import'
    });
  }
});

/**
 * POST /api/csv-import/kaggle-kl
 * Import Kaggle KL property dataset (53,884 records)
 */
router.post('/kaggle-kl', async (req, res) => {
  try {
    const kaggleFilePath = 'data_kaggle.csv';
    
    if (!fs.existsSync(kaggleFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'Kaggle KL dataset not found. Please ensure data_kaggle.csv exists.'
      });
    }

    console.log(`🏢 Importing Kaggle KL properties: ${kaggleFilePath}`);
    
    const results = await multiDatasetImporter.importKaggleData(kaggleFilePath);

    res.json({
      success: true,
      message: 'Kaggle KL properties imported successfully',
      results: {
        imported: results.imported,
        skipped: results.skipped,
        errorCount: results.errors.length,
        note: `${results.imported} KL properties now searchable in dropdown`
      }
    });

  } catch (error) {
    console.error('❌ Kaggle KL import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Kaggle KL import'
    });
  }
});

/**
 * POST /api/csv-import/all-datasets
 * Import all available datasets in sequence
 */
router.post('/all-datasets', async (req, res) => {
  try {
    const results = {
      mudahRentals: { imported: 0, skipped: 0, errors: [] as string[] },
      kaggleKL: { imported: 0, skipped: 0, errors: [] as string[] },
      totalImported: 0
    };

    console.log('🚀 Starting bulk import of all real property datasets...');

    // Import Mudah rentals
    if (fs.existsSync('mudah-apartment-kl-selangor.csv')) {
      console.log('📥 Importing Mudah rental properties...');
      results.mudahRentals = await multiDatasetImporter.importMudahRentals('mudah-apartment-kl-selangor.csv');
      results.totalImported += results.mudahRentals.imported;
    }

    // Import Kaggle KL data
    if (fs.existsSync('data_kaggle.csv')) {
      console.log('📥 Importing Kaggle KL properties...');
      results.kaggleKL = await multiDatasetImporter.importKaggleData('data_kaggle.csv');
      results.totalImported += results.kaggleKL.imported;
    }

    console.log(`🎉 ALL IMPORTS COMPLETE! Total: ${results.totalImported} properties imported`);

    res.json({
      success: true,
      message: `Successfully imported ${results.totalImported} real KL/Selangor properties`,
      results: {
        mudahRentals: {
          imported: results.mudahRentals.imported,
          skipped: results.mudahRentals.skipped,
          errors: results.mudahRentals.errors.length
        },
        kaggleKL: {
          imported: results.kaggleKL.imported,
          skipped: results.kaggleKL.skipped,
          errors: results.kaggleKL.errors.length
        },
        totalImported: results.totalImported,
        note: `${results.totalImported} properties now searchable when typing 3+ characters`
      }
    });

  } catch (error) {
    console.error('❌ Bulk import error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during bulk import'
    });
  }
});

export default router;