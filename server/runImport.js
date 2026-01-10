// Quick script to run the comprehensive data import
import { ComprehensiveDataImporter } from './services/comprehensiveDataImporter.js';

async function runImport() {
  try {
    console.log('🚀 Starting comprehensive data import...');
    const importer = new ComprehensiveDataImporter();
    const result = await importer.importAllData();
    console.log('✅ Import completed successfully!');
    console.log('📊 Results:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

runImport();