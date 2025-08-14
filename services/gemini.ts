const baseUrl = 'http://localhost:5001/salon-stock-app/us-central1/api';

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/gemini/description`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productName, category }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.description;
};

export const parseInvoiceImage = async (imageBase64: string): Promise<any> => {
  const response = await fetch(`${baseUrl}/gemini/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
