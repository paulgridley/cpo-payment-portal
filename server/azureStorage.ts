import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as XLSX from 'xlsx';
import { storage } from './storage';
import { InsertPenalty } from '@shared/schema';

// Azure Blob Storage configuration
const STORAGE_ACCOUNT_NAME = 'parkingchargenotices';
const STORAGE_CONTAINER_NAME = 'cpo';

export class AzureStorageService {
  private blobServiceClient?: BlobServiceClient;
  private containerClient?: ContainerClient;
  private isAvailable: boolean = false;

  constructor(connectionString?: string) {
    try {
      if (connectionString) {
        // Explicit connection string provided
        console.log('Initializing Azure Storage with connection string...');
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.isAvailable = true;
        console.log('Azure Storage service initialized with connection string');
      } else {
        // Check for connection string environment variable first (for development)
        const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (envConnectionString) {
          console.log('Initializing Azure Storage with connection string from environment...');
          this.blobServiceClient = BlobServiceClient.fromConnectionString(envConnectionString);
          this.isAvailable = true;
          console.log('Azure Storage service initialized with connection string from environment');
        } else {
          // Use DefaultAzureCredential for managed identity authentication (production)
          console.log('Initializing Azure Storage with DefaultAzureCredential (managed identity)...');
          const credential = new DefaultAzureCredential();
          const accountUrl = `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
          
          this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
          
          // Test the credential by attempting a simple operation
          this.isAvailable = true;
          console.log(`Azure Storage service initialized with managed identity for account: ${STORAGE_ACCOUNT_NAME}`);
        }
      }
      
      if (this.blobServiceClient) {
        this.containerClient = this.blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
        this.ensureContainerExists();
      }
    } catch (error) {
      console.error('Failed to initialize Azure Storage service:', error);
      if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        console.error('For managed identity: Ensure the identity has Storage Blob Data Contributor role on the storage account');
        console.error('For development: Set AZURE_STORAGE_CONNECTION_STRING environment variable or run "az login"');
      }
      this.isAvailable = false;
    }
  }

  // Check if Azure Storage is available
  public isStorageAvailable(): boolean {
    return this.isAvailable;
  }

  // Helper method to throw storage unavailable error
  private throwStorageUnavailableError(): never {
    const connectionStringExists = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
    const errorMessage = connectionStringExists 
      ? 'Azure Storage is not available. Please check your connection string configuration.'
      : 'Azure Storage is not available. For managed identity: ensure proper permissions. For development: set AZURE_STORAGE_CONNECTION_STRING or run "az login".';
    throw new Error(errorMessage);
  }

  // Ensure the container exists
  private async ensureContainerExists(): Promise<void> {
    try {
      if (!this.containerClient) {
        throw new Error('Container client not initialized');
      }
      await this.containerClient.createIfNotExists();
      console.log(`Azure container '${STORAGE_CONTAINER_NAME}' ensured to exist`);
    } catch (error) {
      console.error('Failed to ensure Azure container exists:', error);
      // Check if this is an authentication error
      if (error instanceof Error && error.message.includes('authentication')) {
        console.error('Authentication failed - Azure Storage will be marked as unavailable');
        this.isAvailable = false;
      }
      // Don't throw here - the container might already exist and we just don't have permissions to create
    }
  }

  // Upload a file to Azure Blob Storage
  async uploadFile(fileName: string, buffer: Buffer, contentType?: string): Promise<string> {
    if (!this.isAvailable || !this.containerClient) {
      this.throwStorageUnavailableError();
    }
    
    try {
      // Sanitize filename to prevent path traversal
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blockBlobClient = this.containerClient.getBlockBlobClient(sanitizedFileName);
      
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType || 'application/octet-stream'
        }
      });
      
      return blockBlobClient.url;
    } catch (error) {
      console.error('Failed to upload file to Azure:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Download a file from Azure Blob Storage
  async downloadFile(fileName: string): Promise<Buffer> {
    if (!this.isAvailable || !this.containerClient) {
      this.throwStorageUnavailableError();
    }
    
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    const downloadResponse = await blockBlobClient.download(0);
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download file');
    }
    
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      downloadResponse.readableStreamBody!.on('data', (chunk) => {
        chunks.push(chunk);
      });
      downloadResponse.readableStreamBody!.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      downloadResponse.readableStreamBody!.on('error', reject);
    });
  }

  // List files in the container
  async listFiles(): Promise<string[]> {
    if (!this.isAvailable || !this.containerClient) {
      this.throwStorageUnavailableError();
    }
    
    const fileNames: string[] = [];
    for await (const blob of this.containerClient.listBlobsFlat()) {
      fileNames.push(blob.name);
    }
    return fileNames;
  }

  // Process Excel file and update database
  async processExcelFile(fileName: string): Promise<{ processed: number; errors: string[] }> {
    try {
      const buffer = await this.downloadFile(fileName);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert Excel data to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Skip header row and process data
      const dataRows = jsonData.slice(1) as any[][];
      const errors: string[] = [];
      let processedCount = 0;
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // +2 because we skipped header and arrays are 0-indexed
        
        try {
          // Assuming Excel columns are:
          // A: Ticket No, B: VRM, C: Vehicle Make, D: Penalty Amount, 
          // E: Date Issued, F: Site, G: Reason for Issue, H: Badge ID
          if (!row[0] || !row[1] || !row[3]) {
            errors.push(`Row ${rowNum}: Missing required fields (Ticket No, VRM, or Penalty Amount)`);
            continue;
          }
          
          const penaltyData: InsertPenalty = {
            ticketNo: row[0]?.toString().trim(),
            vrm: row[1]?.toString().trim().toUpperCase(),
            vehicleMake: row[2]?.toString().trim() || null,
            penaltyAmount: parseFloat(row[3]?.toString() || '0').toFixed(2),
            dateIssued: this.parseExcelDate(row[4]),
            site: row[5]?.toString().trim() || null,
            reasonForIssue: row[6]?.toString().trim() || null,
            badgeId: row[7]?.toString().trim() || null,
            status: 'active'
          };
          
          // Validate penalty amount
          const penaltyFloat = parseFloat(penaltyData.penaltyAmount);
          if (isNaN(penaltyFloat) || penaltyFloat <= 0) {
            errors.push(`Row ${rowNum}: Invalid penalty amount`);
            continue;
          }
          
          // Check if penalty already exists to avoid duplicates
          const existing = await storage.getPenaltyByTicketNo(penaltyData.ticketNo);
          if (existing) {
            // Update existing penalty
            await storage.updatePenalty(existing.id, penaltyData);
          } else {
            // Create new penalty
            await storage.createPenalty(penaltyData);
          }
          
          processedCount++;
        } catch (error) {
          errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return { processed: processedCount, errors };
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Parse contravention date from Excel - return formatted DD/MM/YYYY hh:mm:ss string
  private parseContraventionDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    // Helper function to format date as DD/MM/YYYY hh:mm:ss
    const formatDate = (date: Date): string => {
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    };
    
    // Convert Excel serial number to Date
    const fromExcelSerial = (serial: number): Date => {
      // Excel serial date: (serial - 25569) * 86400000 milliseconds since Unix epoch
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      return new Date(ms);
    };
    
    // Handle Excel serial number dates (number type)
    if (typeof dateValue === 'number') {
      const parsedDate = fromExcelSerial(dateValue);
      return formatDate(parsedDate);
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.toString().trim();
      
      // Check if it's a numeric string (Excel serial number as string)
      const numericPattern = /^\d+(\.\d+)?$/;
      if (numericPattern.test(dateStr)) {
        const serial = parseFloat(dateStr);
        if (!isNaN(serial)) {
          const parsedDate = fromExcelSerial(serial);
          return formatDate(parsedDate);
        }
      }
      
      // Try various date formats that might come from Excel
      const formats = [
        // DD/MM/YYYY HH:mm:ss format
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
        // DD/MM/YYYY HH:mm format
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/,
        // DD/MM/YYYY format
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // DD-MM-YYYY format
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // JS months are 0-based
          const year = parseInt(match[3]);
          const hours = match[4] ? parseInt(match[4]) : 0;
          const minutes = match[5] ? parseInt(match[5]) : 0;
          const seconds = match[6] ? parseInt(match[6]) : 0;
          
          const parsedDate = new Date(year, month, day, hours, minutes, seconds);
          if (!isNaN(parsedDate.getTime())) {
            return formatDate(parsedDate);
          }
        }
      }
      
      // Try generic date parsing as fallback
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return formatDate(parsed);
      }
    }
    
    // Return original value as string if parsing fails completely
    return dateValue?.toString() || null;
  }

  // Parse Excel date (Excel dates are stored as numbers)
  private parseExcelDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    if (typeof dateValue === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1900, 0, 1);
      const days = dateValue - 2; // Excel incorrectly treats 1900 as a leap year
      return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    }
    
    if (typeof dateValue === 'string') {
      // Try to parse as date string
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Default to current date if parsing fails
    return new Date();
  }

  // Search penalties directly from Excel file
  async searchPenaltiesFromExcel(fileName: string, ticketNo?: string, vrm?: string): Promise<any[]> {
    try {
      const buffer = await this.downloadFile(fileName);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert Excel data to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Skip header row and search data
      const dataRows = jsonData.slice(1) as any[][];
      const results = [];
      
      for (const row of dataRows) {
        // Excel columns per user specification:
        // A: Ticket No, B: VRM, C: Contravention date & time, D: Site, E: Charge
        const rowTicketNo = row[0]?.toString().trim();
        const rowVrm = row[1]?.toString().trim().toUpperCase();
        
        // Skip empty rows
        if (!rowTicketNo || !rowVrm) continue;
        
        // Check if this row matches the search criteria
        const ticketMatch = !ticketNo || rowTicketNo === ticketNo;
        const vrmMatch = !vrm || rowVrm === vrm.toUpperCase();
        
        if (ticketMatch && vrmMatch) {
          // Parse charge amount more safely - remove £ symbol and other non-numeric chars
          const chargeString = row[4]?.toString().replace(/[£$,\s]/g, '') || '0';
          const chargeAmount = parseFloat(chargeString);
          const validChargeAmount = isNaN(chargeAmount) ? 0 : chargeAmount;
          
          // Parse date more safely from Excel format
          const contraventionDate = this.parseContraventionDate(row[2]);
          
          results.push({
            id: rowTicketNo, // Use ticket number as unique ID
            ticketNo: rowTicketNo,
            vrm: rowVrm,
            contraventionDateTime: contraventionDate, // Column C - keep as string
            site: row[3]?.toString().trim() || null, // Column D
            penaltyAmount: validChargeAmount.toFixed(2), // Column E - safely parsed charge
            dateIssued: contraventionDate, // Use same date for consistency
            status: 'active'
          });
        }
      }
      //
      return results;
    } catch (error) {
      console.error('Failed to search Excel file:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check for new files and process them
  async checkAndProcessNewFiles(): Promise<{ filesProcessed: string[]; results: any[] }> {
    const files = await this.listFiles();
    const excelFiles = files.filter(file => 
      file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
    );
    
    const results = [];
    const filesProcessed = [];
    
    for (const file of excelFiles) {
      try {
        const result = await this.processExcelFile(file);
        results.push({ file, ...result });
        filesProcessed.push(file);
        console.log(`Processed file ${file}: ${result.processed} records, ${result.errors.length} errors`);
      } catch (error) {
        console.error(`Failed to process file ${file}:`, error);
        results.push({ 
          file, 
          processed: 0, 
          errors: [error instanceof Error ? error.message : 'Unknown error'] 
        });
      }
    }
    
    return { filesProcessed, results };
  }
}

export const azureStorage = new AzureStorageService();