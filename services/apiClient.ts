import * as geminiApi from './gemini';

const baseUrl = 'http://localhost:5001/salon-stock-app/us-central1/api';

const apiClient = {
  async get(path: string, params?: any): Promise<any> {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();

    /*
    const poMatch = path.match(/^\/purchase-orders\/(.+)$/);
    if (poMatch) {
      return api.getPurchaseOrderById(poMatch[1]);
    }
    
    const productMatch = path.match(/^\/products\/(.+)$/);
    if (productMatch) {
      return api.getProductById(productMatch[1], params?.storeId);
    }

    switch (path) {
      case '/products':
        if (params?.barcode) return api.findProductByBarcode(params.barcode, params?.storeId);
        return api.getProducts(params?.storeId);
      case '/products/auju':
        if (params?.barcode) {
          console.log(`%c[API Client Debug] Calling findProductByBarcode for Aujua. Barcode: \"${params.barcode}\", Store ID: \"${params.storeId}\"`, 'color: #f59e0b; font-weight: bold;');
          return api.findProductByBarcode(params.barcode, params?.storeId, true);
        }
        return api.getAujuaProducts(params?.storeId);
      case '/suppliers':
        return api.getSuppliers();
      case '/stores':
        return api.getStores();
      case '/categories':
        return api.getCategories();
      case '/intake-items':
        return api.getScheduledIntakeItems(params?.storeId);
      case '/dashboard/admin':
        return api.getAdminDashboardData(params.startDate, params.endDate, params.periodLabel, params.storeId);
      case '/dashboard/staff':
        return api.getStaffDashboardData(params?.storeId);
      case '/dashboard/auju':
        return api.getAujuaDashboardData(params.month, params?.storeId);
      case '/dashboard/category-analysis':
        return api.getCategoryAnalysisData(params.parentCategoryId, params.childCategoryId, params.storeId);
      case '/history/auju':
        return api.getAujuaUnifiedHistory(params?.storeId);
      case '/reports/monthly-purchase':
        return api.getMonthlyPurchaseReport(params.month, params?.storeId);
      case '/users/staff':
        return api.getStaffUsers();
      case '/company-info':
        return api.getCompanyInfo();
      case '/purchase-orders':
        return api.getPurchaseOrders(params?.storeId);
      case '/data/export-all':
        return api.exportAllData();
      case '/data/auto-backups':
        return api.getAutoBackups();
      default:
        throw new Error(`GET path not found: ${path}`);
    }
    */
  },

  async post(path: string, data?: any): Promise<any> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async put(path: string, data: any): Promise<any> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async delete(path: string): Promise<any> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

export default apiClient;