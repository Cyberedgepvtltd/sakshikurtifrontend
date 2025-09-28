import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../Component/logo.png"; // Ensure this path is correct
import SalesmanManagement from "../../Pages/SalesmanManagement/SalesmanManagement"; // Import the new component
import JsBarcode from 'jsbarcode';
import { useRef } from 'react';

function Dashboard() {
  const navigate = useNavigate();

  // API Base URL from environment variable
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // Products - Now fetched from API with initial fallback data
  const [products, setProducts] = useState([
    { id: 1, name: "Kurti", stock: 100, price: 500, barcode: "KUR001", size: "M", description: "Sample Kurti" },
    { id: 2, name: "Dupatta", stock: 50, price: 200, barcode: "DUP001", size: "One Size", description: "Sample Dupatta" },
    { id: 3, name: "Leggings", stock: 70, price: 300, barcode: "LEG001", size: "L", description: "Sample Leggings" },
  ]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // State
  const [billItems, setBillItems] = useState([]);
  const [showBill, setShowBill] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showSalesmanManagement, setShowSalesmanManagement] = useState(false); // New state for salesman management
  const [gstOption, setGstOption] = useState("with");
  const [discountType, setDiscountType] = useState("none");
  const [customDiscount, setCustomDiscount] = useState(0);
  const [customer, setCustomer] = useState({
    name: "",
    address: "",
    mobile: "",
    gstin: "",
  });
  
  // Updated newProduct state to match database schema
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    size: "",
    stock: 0,
    price: 0,
    description: "",
  });
  
  const [stockUpdate, setStockUpdate] = useState({ id: null, quantity: 0 });
  
  // New state for create account form
  const [newAccount, setNewAccount] = useState({
    username: "",
    email: "",
    password: "",
    mobile: "",
    role: "admin"
  });


  const generateUniqueBarcode = () => {
  const prefix = 'SK'; // SK for Sakshi Kurti
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 random digits
  return `${prefix}${timestamp}${random}`;
};

// Add this function inside Dashboard component
const printBarcode = (barcode) => {
  // Create print window
  const printWindow = window.open('', '_blank');
  
  // Create HTML content
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Barcode</title>
        <style>
          body {
            margin: 0;
            padding: 10px;
            text-align: center;
          }
          @media print {
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              width: 50mm;
              height: 30mm;
            }
          }
        </style>
      </head>
      <body>
        <canvas id="barcodeCanvas"></canvas>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          JsBarcode("#barcodeCanvas", "${barcode}", {
            format: "CODE128",
            width: 1.5,
            height: 30,
            displayValue: true,
            fontSize: 8,
            margin: 5
          });
          // Print automatically
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
};


  // Loading states for API calls
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false); // ADD THIS LINE - Missing state

  // New states for single product view
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [isLoadingSingleProduct, setIsLoadingSingleProduct] = useState(false);

  // New states for salesman management
  const [salesmen, setSalesmen] = useState([]);
  const [isLoadingSalesmen, setIsLoadingSalesmen] = useState(false);
  const [showAddSalesmanModal, setShowAddSalesmanModal] = useState(false);
  const [showMorningTakeModal, setShowMorningTakeModal] = useState(false);
  const [showEveningReturnModal, setShowEveningReturnModal] = useState(false);
  const [showSalesmanReportModal, setShowSalesmanReportModal] = useState(false);
  const [isAddingSalesman, setIsAddingSalesman] = useState(false);
  const [isTakingProducts, setIsTakingProducts] = useState(false);
  const [isReturningProducts, setIsReturningProducts] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [salesmanProducts, setSalesmanProducts] = useState([]);
  const [salesmanReport, setSalesmanReport] = useState([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // New salesman form state
  const [newSalesman, setNewSalesman] = useState({
    name: "",
    mobile: ""
  });

  // ADD THIS FUNCTION - Missing editProduct function
  const editProduct = (product) => {
    // Set the product data to the newProduct state
    setNewProduct({
      name: product.name,
      barcode: product.barcode,
      size: product.size,
      stock: product.stock,
      price: product.price,
      description: product.description || "",
    });
    // Open the add product modal (can be renamed to "Edit Product" when editing)
    setShowAddProductModal(true);
  };

  // Fetch salesmen from API
  const fetchSalesmen = async () => {
    try {
      setIsLoadingSalesmen(true);
      const response = await fetch(`${API_BASE_URL}/api/salesmen`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSalesmen(data.data);
        }
      } else {
        console.error('Failed to fetch salesmen:', response.status);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    } finally {
      setIsLoadingSalesmen(false);
    }
  };

  // Add new salesman
  const handleAddSalesman = async () => {
    if (!newSalesman.name || !newSalesman.mobile) {
      alert("Please enter salesman name and mobile number!");
      return;
    }

    // Mobile validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(newSalesman.mobile)) {
      alert("Please enter a valid 10-digit mobile number!");
      return;
    }

    setIsAddingSalesman(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/salesmen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSalesman.name,
          mobile: newSalesman.mobile
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Salesman "${newSalesman.name}" added successfully!`);
        await fetchSalesmen(); // Refresh salesmen list
        
        setNewSalesman({ name: "", mobile: "" });
        setShowAddSalesmanModal(false);
      } else {
        if (data.message && data.message.includes('Mobile number already exists')) {
          alert('This mobile number already exists. Please use a different number.');
        } else {
          alert(data.message || 'Failed to add salesman. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding salesman:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsAddingSalesman(false);
    }
  };

  // Morning take products
  const handleMorningTake = async () => {
    if (!selectedSalesman || salesmanProducts.length === 0) {
      alert("Please select a salesman and add products!");
      return;
    }

    // Validate all products have valid quantities
    const invalidProducts = salesmanProducts.filter(p => !p.quantity || p.quantity <= 0);
    if (invalidProducts.length > 0) {
      alert("Please enter valid quantities for all products!");
      return;
    }

    setIsTakingProducts(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/salesmen/${selectedSalesman}/take`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: salesmanProducts.map(p => ({
            product_id: p.product_id,
            quantity: parseInt(p.quantity)
          }))
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Products taken successfully!");
        await fetchProducts(); // Refresh products list
        
        setSalesmanProducts([]);
        setSelectedSalesman(null);
        setShowMorningTakeModal(false);
      } else {
        alert(data.message || 'Failed to take products. Please try again.');
      }
    } catch (error) {
      console.error('Error taking products:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsTakingProducts(false);
    }
  };

  // Evening return products
  const handleEveningReturn = async () => {
    if (!selectedSalesman || salesmanProducts.length === 0) {
      alert("Please select a salesman and add products!");
      return;
    }

    // Validate all products have valid quantities
    const invalidProducts = salesmanProducts.filter(p => !p.quantity || p.quantity <= 0);
    if (invalidProducts.length > 0) {
      alert("Please enter valid quantities for all products!");
      return;
    }

    setIsReturningProducts(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/salesmen/${selectedSalesman}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: salesmanProducts.map(p => ({
            product_id: p.product_id,
            quantity: parseInt(p.quantity)
          }))
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Products returned successfully!");
        await fetchProducts(); // Refresh products list
        
        setSalesmanProducts([]);
        setSelectedSalesman(null);
        setShowEveningReturnModal(false);
      } else {
        alert(data.message || 'Failed to return products. Please try again.');
      }
    } catch (error) {
      console.error('Error returning products:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsReturningProducts(false);
    }
  };

  // Fetch salesman report
  const fetchSalesmanReport = async (salesmanId, date) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/salesmen/${salesmanId}/report?date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSalesmanReport(data.data);
        }
      } else {
        console.error('Failed to fetch report:', response.status);
        setSalesmanReport([]);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setSalesmanReport([]);
    }
  };

  // Add product to salesman list
  const addProductToSalesman = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingProduct = salesmanProducts.find(p => p.product_id === productId);
    if (existingProduct) {
      alert("Product already added!");
      return;
    }

    setSalesmanProducts(prev => [...prev, {
      product_id: productId,
      product_name: product.name,
      available_stock: product.stock,
      quantity: 1
    }]);
  };

  // Remove product from salesman list
  const removeProductFromSalesman = (productId) => {
    setSalesmanProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  // Update product quantity in salesman list
  const updateSalesmanProductQuantity = (productId, quantity) => {
    setSalesmanProducts(prev => 
      prev.map(p => 
        p.product_id === productId 
          ? { ...p, quantity: parseInt(quantity) || 0 }
          : p
      )
    );
  };

  // Load salesmen on component mount
  useEffect(() => {
    fetchSalesmen();
  }, []);

  // Function to view single product details
  const viewProductDetails = async (productId) => {
    setIsLoadingSingleProduct(true);
    setShowProductDetailsModal(true);
    
    const product = await fetchProductById(productId);
    if (product) {
      setSelectedProduct(product);
    } else {
      // Fallback to local product data if API fails
      const localProduct = products.find(p => p.id === productId);
      setSelectedProduct(localProduct || null);
    }
    
    setIsLoadingSingleProduct(false);
  };

  // Update stock using PATCH API
  const handleUpdateStockAPI = async () => {
    if (!stockUpdate.id || stockUpdate.quantity <= 0) {
      alert("Please select a product and enter valid stock quantity!");
      return;
    }

    setIsUpdatingStock(true);

    try {
      // Get current stock first
      const currentProduct = products.find(p => p.id === stockUpdate.id);
      const newStock = currentProduct.stock + parseInt(stockUpdate.quantity);

      const response = await fetch(`${API_BASE_URL}/api/products/${stockUpdate.id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock: newStock
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Stock updated successfully! New stock: ${data.data.stock}`);
        await fetchProducts(); // Refresh the products list
        
        setStockUpdate({ id: null, quantity: 0 });
        setShowStockModal(false);
      } else {
        alert(data.message || 'Failed to update stock. Please try again.');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Fetch products from API on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch all products from API
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch(`${API_BASE_URL}/api/products`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched products:', data); // Debug log
        
        // Handle different API response formats
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (data.data && Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          console.error('API response format not recognized:', data);
          // Keep existing fallback data
        }
      } else {
        console.error('Failed to fetch products:', response.status, response.statusText);
        // Keep existing fallback data
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Keep existing fallback data
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch single product by ID
  const fetchProductById = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched product ${productId}:`, data); // Debug log
        return data;
      } else {
        console.error(`Failed to fetch product ${productId}:`, response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      return null;
    }
  };

  const handleLogout = () => navigate("/");

  // Function to update product stock (for salesman management)
  const updateProductStock = (productId, quantityChange) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, stock: product.stock + quantityChange }
          : product
      )
    );
  };

  // Calculate discount amount
  const calculateDiscount = (subtotal) => {
    switch (discountType) {
      case "5%":
        return subtotal * 0.05;
      case "10%":
        return subtotal * 0.10;
      case "custom":
        return parseFloat(customDiscount) || 0;
      default:
        return 0;
    }
  };

  // Open modal for billing
  const openSellForm = () => {
    if (billItems.length === 0) {
      alert("Please add products before generating bill!");
      return;
    }
    setShowModal(true);
  };

  // Add new product with API integration
  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.name || !newProduct.barcode || !newProduct.size || newProduct.stock <= 0 || newProduct.price <= 0) {
      alert("Please enter valid product details! All fields are required.");
      return;
    }

    setIsAddingProduct(true);

    try {
      // Get user ID from localStorage or context (assuming you store it after login)
      const userId = localStorage.getItem('userId') || 1; // Default to 1 if not found

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if you have authentication
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newProduct.name,
          barcode: newProduct.barcode,
          size: newProduct.size,
          stock: parseInt(newProduct.stock),
          price: parseFloat(newProduct.price),
          description: newProduct.description,
          created_by: parseInt(userId)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - refresh products list
        alert(`Product "${newProduct.name}" added successfully!`);
        await fetchProducts(); // Refresh the products list
        
        // Reset form and close modal
        setNewProduct({ 
          name: "", 
          barcode: "", 
          size: "", 
          stock: 0, 
          price: 0, 
          description: "" 
        });
        setShowAddProductModal(false);
      } else {
        // Handle API error
        if (response.status === 400 && data.message && data.message.includes('barcode')) {
          alert('This barcode already exists. Please use a unique barcode.');
        } else {
          alert(data.message || 'Failed to add product. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Create new account function with API integration
  const handleCreateAccount = async () => {
    // Validation
    if (!newAccount.username || !newAccount.email || !newAccount.password || !newAccount.mobile) {
      alert("Please fill all required fields!");
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAccount.email)) {
      alert("Please enter a valid email address!");
      return;
    }
    
    // Mobile validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(newAccount.mobile)) {
      alert("Please enter a valid 10-digit mobile number!");
      return;
    }
    
    // Password validation (minimum 6 characters)
    if (newAccount.password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }
    
    setIsCreatingAccount(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newAccount.username,
          email: newAccount.email,
          password: newAccount.password,
          mobile: newAccount.mobile,
          role: newAccount.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        alert(`Account created successfully for ${newAccount.username}!`);
        
        // Reset form and close modal
        setNewAccount({
          username: "",
          email: "",
          password: "",
          mobile: "",
          role: "admin"
        });
        setShowCreateAccountModal(false);
      } else {
        // Handle API error
        alert(data.message || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Update stock (old method - keeping for backward compatibility)
  const handleUpdateStock = () => {
    if (stockUpdate.quantity <= 0) {
      alert("Please enter valid stock quantity!");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === stockUpdate.id
          ? { ...p, stock: p.stock + parseInt(stockUpdate.quantity) }
          : p
      )
    );
    setStockUpdate({ id: null, quantity: 0 });
    setShowStockModal(false);
  };

  // Add product to bill with quantity
  const handleAddToBill = (id, qty) => {
    const product = products.find((p) => p.id === id);
    if (product && qty > 0 && product.stock >= qty) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, stock: p.stock - qty } : p
        )
      );
      setBillItems((prev) => {
        const existing = prev.find((item) => item.id === id);
        if (existing) {
          return prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  qty: item.qty + qty,
                  total: (item.qty + qty) * item.price,
                }
              : item
          );
        } else {
          return [
            ...prev,
            {
              id,
              name: product.name,
              qty,
              price: product.price,
              total: qty * product.price,
            },
          ];
        }
      });
    } else {
      alert("Insufficient stock or invalid quantity!");
    }
  };

  const exportSalesmanReportToExcel = async () => {
    if (!selectedSalesman) {
      alert("Please select a salesman first!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/salesmen/report/excel?date=${reportDate}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Salesman_Report_${reportDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download Excel report');
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Failed to download Excel report');
    }
  };

  // Finalize bill
  const generateBill = () => {
    if (!customer.name || !customer.mobile) {
      alert("Enter customer details!");
      return;
    }
    setShowModal(false);
    setShowBill(true);
  };

  // Number to words
  const numberToWords = (num) => {
    const a = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const makeWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100)
        return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
      if (n < 1000)
        return (
          a[Math.floor(n / 100)] +
          " Hundred " +
          (n % 100 === 0 ? "" : makeWords(n % 100))
        );
      return "";
    };
    if (num === 0) return "Zero";
    let crore = Math.floor(num / 10000000);
    let lakh = Math.floor((num % 10000000) / 100000);
    let thousand = Math.floor((num % 100000) / 1000);
    let hundred = Math.floor((num % 1000) / 100);
    let rest = num % 100;
    let str = "";
    if (crore) str += makeWords(crore) + " Crore ";
    if (lakh) str += makeWords(lakh) + " Lakh ";
    if (thousand) str += makeWords(thousand) + " Thousand ";
    if (hundred) str += makeWords(hundred) + " Hundred ";
    if (rest) str += makeWords(rest);
    return str.trim();
  };
const lineHeight = 6;
  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const drawDottedRect = (x, y, w, h) => {
      doc.setLineWidth(0.5);
      doc.setLineDash([2, 2], 0);
      doc.rect(x, y, w, h);
      doc.setLineDash([]);
    };
    doc.setFontSize(12);
   doc.text("Shree Ganeshay Namah", 105, 10, { align: 'center' });
    doc.setFontSize(14);
    doc.text("TAX INVOICE", 170, 10);
    doc.setFontSize(16);
    // doc.text("SAKSHI KURTI", 70, 20, { align: 'left' });
    doc.text("SAKSHI KURTI", 10, 20, { align: 'left' });

    doc.setFontSize(11);
    doc.text(" Saklenabad ", 14, 28);
    doc.text("Tanishq Showroom ke bagal me, Ghazipur", 14, 34);
    doc.text("Mob : 7678180588", 150, 28);
    doc.text("GSTIN: 09FQZPS7403H1ZX", 14, 40);
    drawDottedRect(14, 50, 182, 35);
    doc.text(`M/s: ${customer.name}`, 16, 58);
    if (customer.address) doc.text(customer.address, 16, 64);
    if (customer.mobile) doc.text(`Mobile: ${customer.mobile}`, 16, 70);
    if (customer.gstin) doc.text(`Customer GSTIN: ${customer.gstin}`, 16, 76);
    const invoiceNo = "INV-" + Math.floor(Math.random() * 1000);
    const today = new Date().toLocaleDateString();
    drawDottedRect(150, 50, 46, 20);
    doc.text(`Invoice No: ${invoiceNo}`, 152, 58);
    doc.text(`Date: ${today}`, 152, 66);
    const tableColumn = ["Product", "Qty", "Price", "Total"];
    const tableRows = [];
    let grandTotal = 0;
    billItems.forEach((item) => {
      tableRows.push([item.name, item.qty, `₹${item.price}`, `₹${item.total}`]);
      grandTotal += item.total;
    });
    autoTable(doc, {
      startY: 90,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      styles: {
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        fontSize: 11,
      },
      didDrawCell: (data) => {
        doc.setLineDash([2, 2], 0);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        doc.setLineDash([]);
      },
      headStyles: { fillColor: [230, 230, 230] },
    });
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Calculate discount and final amounts
    let discountAmount = calculateDiscount(grandTotal);
    let afterDiscount = grandTotal - discountAmount;
    let gstAmt = gstOption === "with" ? afterDiscount * 0.05 : 0;
    let netTotal = afterDiscount + gstAmt;
    
    // Adjust rectangle height based on discount
    const rectHeight = discountAmount > 0 ? 34 : 28;
    drawDottedRect(120, finalY, 76, rectHeight);
    
    let yPosition = finalY + 6;
    doc.text(`Sub Total: ₹${grandTotal.toFixed(2)}`, 122, yPosition);
    
    if (discountAmount > 0) {
      yPosition += 6;
      const discountText = discountType === "custom" ? 
        `- Discount: ₹${discountAmount.toFixed(2)}` : 
        `- Discount (${discountType}): ₹${discountAmount.toFixed(2)}`;
      doc.text(discountText, 122, yPosition);
    }
    
    if (gstOption === "with") {
      yPosition += 6;
      doc.text(`+ GST (5%): ₹${gstAmt.toFixed(2)}`, 122, yPosition);
    }
    
    yPosition += 6;
    doc.text(`Net Amount: ₹${netTotal.toFixed(2)}`, 122, yPosition);
    
   // First line
doc.text(`Rs. (In Words): ${numberToWords(Math.round(netTotal))}`, 14, finalY + 6);
doc.text("Only", 14, finalY + 6 + lineHeight);

    
    drawDottedRect(14, finalY + 40, 182, 40);
    doc.text("HDFC BANK", 16, finalY + 46);
    doc.text("BRANCH: JANGIPUR GHAZIPUR", 16, finalY + 52);
    doc.text("A/C NO: 50200113743923", 16, finalY + 58);
    doc.text("IFSC CODE: HDFC0009054", 16, finalY + 64);
    doc.text("REMARKS: GR ACCEPTABLE ONLY WITHIN 7 DAYS.", 16, finalY + 70);
    drawDottedRect(14, finalY + 85, 182, 40);
    doc.setFontSize(10);
    doc.text("TERMS & CONDITIONS:", 16, finalY + 91);
    doc.text(
      "1. Any claim or dispute arising from change in quality or shortage in quantity or any cause",
      16,
      finalY + 97
    );
    doc.text(
      "whatsoever will not be entertained once the goods are delivered.",
      16,
      finalY + 103
    );
    doc.text(
      "2. Late payment charges at 24% p.a. will be charged on amount of the bill after due date.",
      16,
      finalY + 109
    );
    doc.text(
      "3. Seller is not responsible for any loss or damage during transit.",
      16,
      finalY + 115
    );
    doc.text("4. Subject to Surat Jurisdiction only.", 16, finalY + 121);
    doc.text("For SAKSHI KURTI", 150, finalY + 135);
    doc.save("invoice.pdf");
  };

  // Calculate totals for display
  const grandTotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = calculateDiscount(grandTotal);
  const afterDiscount = grandTotal - discountAmount;
  const gstAmount = gstOption === "with" ? afterDiscount * 0.05 : 0;
  const finalTotal = afterDiscount + gstAmount;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <img src={logo} alt="Sakshi Kurti Logo" className="header-logo" />
          <h1>Sakshi Kurti</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-actions">
          <button onClick={() => setShowAddProductModal(true)}>
            ➕ Add New Product
          </button>
          <button onClick={() => setShowStockModal(true)}>
            📦 Update Stock
          </button>
          <button onClick={() => setShowCreateAccountModal(true)}>
            👤 Create New Account
          </button>
          <button onClick={() => setShowAddSalesmanModal(true)}>
            👨‍💼 Add Salesman
          </button>
          <button onClick={() => setShowMorningTakeModal(true)}>
            🌅 Morning Take Product
          </button>
          <button onClick={() => setShowEveningReturnModal(true)}>
            🌆 Evening Return Product
          </button>
          <button onClick={() => setShowSalesmanReportModal(true)}>
            📊 Salesman Report
          </button>
          <button onClick={fetchProducts} disabled={isLoadingProducts}>
            🔄 {isLoadingProducts ? "Refreshing..." : "Refresh Products"}
          </button>
        </div>

        <h2>🛍️ Products</h2>
        
        {isLoadingProducts ? (
          <div className="loading">Loading products...</div>
        ) : products && products.length > 0 ? (
          <div className="product-list">
            {products.map((p) => (
              <div key={p.id} className="product-card">
                <div className="product-header">
                  <h3>{p.name}</h3>
                 
                </div>
                <p><strong>Barcode:</strong> {p.barcode}</p>
                <p><strong>Size:</strong> {p.size}</p>
                <p><strong>Available:</strong> {p.stock}</p>
                <p><strong>Price:</strong> ₹{p.price}</p>
                {p.description && <p><strong>Description:</strong> {p.description}</p>}
                <div className="quantity-selector">
                  <button
                    onClick={(e) => {
                      const input = e.target.nextSibling;
                      const qty = parseInt(input.value) || 1;
                      if (qty > 1) input.value = qty - 1;
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={p.stock}
                    defaultValue="1"
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 1;
                      e.target.value = qty > p.stock ? p.stock : qty;
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      const qty = parseInt(input.value) || 1;
                      if (qty < p.stock) input.value = qty + 1;
                    }}
                  >
                    +
                  </button>
                  <button
                    className="add-to-bill"
                    onClick={(e) =>
                      handleAddToBill(
                        p.id,
                        parseInt(e.target.previousSibling.previousSibling.value) || 1
                      )
                    }
                  >
                    Add to Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-products">
            <p>No products available. Add some products to get started!</p>
          </div>
        )}

        {billItems.length > 0 && (
          <button className="checkout-btn" onClick={openSellForm}>
            🧾 Proceed to Checkout
          </button>
        )}
      </div>

      {/* Salesman Management Component */}
      {showSalesmanManagement && (
        <SalesmanManagement
          products={products}
          updateProductStock={updateProductStock}
          onClose={() => setShowSalesmanManagement(false)}
        />
      )}

      {/* Add Salesman Modal */}
      {showAddSalesmanModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add New Salesman</h2>
            <input
              type="text"
              placeholder="Salesman Name *"
              value={newSalesman.name}
              onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })}
              disabled={isAddingSalesman}
            />
            <input
              type="tel"
              placeholder="Mobile Number (10 digits) *"
              value={newSalesman.mobile}
              maxLength="10"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setNewSalesman({ ...newSalesman, mobile: value });
              }}
              disabled={isAddingSalesman}
            />
            <div className="modal-actions">
              <button 
                onClick={handleAddSalesman} 
                disabled={isAddingSalesman}
                style={{ opacity: isAddingSalesman ? 0.6 : 1 }}
              >
                {isAddingSalesman ? "⏳ Adding..." : "✅ Add Salesman"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowAddSalesmanModal(false);
                  setNewSalesman({ name: "", mobile: "" });
                }}
                disabled={isAddingSalesman}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Morning Take Modal */}
      {showMorningTakeModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Morning Take Products</h2>
            <select
              value={selectedSalesman || ""}
              onChange={(e) => setSelectedSalesman(e.target.value)}
            >
              <option value="">Select Salesman</option>
              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.name} - {salesman.mobile}
                </option>
              ))}
            </select>
            
            <div className="product-selection">
              <h3>Select Products:</h3>
              <select
                onChange={(e) => addProductToSalesman(parseInt(e.target.value))}
                value=""
              >
                <option value="">Add Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.barcode} (Stock: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="selected-products">
              {salesmanProducts.map((product) => (
                <div key={product.product_id} className="salesman-product-item">
                  <span>{product.product_name}</span>
                  <input
                    type="number"
                    min="1"
                    max={product.available_stock}
                    value={product.quantity}
                    onChange={(e) => updateSalesmanProductQuantity(product.product_id, e.target.value)}
                  />
                  <button onClick={() => removeProductFromSalesman(product.product_id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button 
                onClick={handleMorningTake}
                disabled={isTakingProducts}
                style={{ opacity: isTakingProducts ? 0.6 : 1 }}
              >
                {isTakingProducts ? "⏳ Taking..." : "✅ Take Products"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowMorningTakeModal(false);
                  setSalesmanProducts([]);
                  setSelectedSalesman(null);
                }}
                disabled={isTakingProducts}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evening Return Modal */}
      {showEveningReturnModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Evening Return Products</h2>
            <select
              value={selectedSalesman || ""}
              onChange={(e) => setSelectedSalesman(e.target.value)}
            >
              <option value="">Select Salesman</option>
              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.name} - {salesman.mobile}
                </option>
              ))}
            </select>
            
            <div className="product-selection">
              <h3>Select Products to Return:</h3>
              <select
                onChange={(e) => addProductToSalesman(parseInt(e.target.value))}
                value=""
              >
                <option value="">Add Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.barcode}
                  </option>
                ))}
              </select>
            </div>

            <div className="selected-products">
              {salesmanProducts.map((product) => (
                <div key={product.product_id} className="salesman-product-item">
                  <span>{product.product_name}</span>
                  <input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => updateSalesmanProductQuantity(product.product_id, e.target.value)}
                  />
                  <button onClick={() => removeProductFromSalesman(product.product_id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button 
                onClick={handleEveningReturn}
                disabled={isReturningProducts}
                style={{ opacity: isReturningProducts ? 0.6 : 1 }}
              >
                {isReturningProducts ? "⏳ Returning..." : "✅ Return Products"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowEveningReturnModal(false);
                  setSalesmanProducts([]);
                  setSelectedSalesman(null);
                }}
                disabled={isReturningProducts}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Salesman Report Modal */}
     {showSalesmanReportModal && (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: '80%', maxWidth: '1000px' }}>
        <h2>Salesman Report</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <select
            value={selectedSalesman || ""}
            onChange={(e) => {
              setSelectedSalesman(e.target.value);
              if (e.target.value) {
                fetchSalesmanReport(e.target.value, reportDate);
              }
            }}
            style={{ flex: 1 }}
          >
            <option value="">Select Salesman</option>
            {salesmen.map((salesman) => (
              <option key={salesman.id} value={salesman.id}>
                {salesman.name} - {salesman.mobile}
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={reportDate}
            onChange={(e) => {
              setReportDate(e.target.value);
              if (selectedSalesman) {
                fetchSalesmanReport(selectedSalesman, e.target.value);
              }
            }}
            style={{ flex: 1 }}
          />
          
          <button 
            onClick={exportSalesmanReportToExcel}
            disabled={!selectedSalesman}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedSalesman ? 'pointer' : 'not-allowed',
              opacity: selectedSalesman ? 1 : 0.5
            }}
          >
            📊 Download Excel
          </button>
        </div>

        <div className="report-content" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {salesmanReport.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #ddd', padding: '10px' }}>Product Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px' }}>Barcode</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px' }}>Action</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px' }}>Quantity</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {salesmanReport.map((record, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{record.product_name || 'N/A'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{record.barcode || 'N/A'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: record.action === 'morning_take' ? '#d4edda' : '#f8d7da',
                        color: record.action === 'morning_take' ? '#155724' : '#721c24'
                      }}>
                        {record.action === 'morning_take' ? 'Take' : 'Return'}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{record.quantity || 0}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {record.created_at 
                        ? new Date(record.created_at).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'N/A'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : selectedSalesman ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No records found for the selected date.</p>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Please select a salesman to view report.</p>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button
            className="cancel-btn"
            onClick={() => {
              setShowSalesmanReportModal(false);
              setSalesmanReport([]);
              setSelectedSalesman(null);
              setReportDate(new Date().toISOString().split('T')[0]);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ❌ Close
          </button>
        </div>
      </div>
    </div>
  )}
     

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Create New Account</h2>
            <input
              type="text"
              placeholder="Username *"
              value={newAccount.username}
              onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
              disabled={isCreatingAccount}
            />
            <input
              type="email"
              placeholder="Email Address *"
              value={newAccount.email}
              onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
              disabled={isCreatingAccount}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters) *"
              value={newAccount.password}
              onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              disabled={isCreatingAccount}
            />
            <input
              type="tel"
              placeholder="Mobile Number (10 digits) *"
              value={newAccount.mobile}
              maxLength="10"
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, '');
                setNewAccount({ ...newAccount, mobile: value });
              }}
              disabled={isCreatingAccount}
            />
            <label>
              Role:{" "}
              <select 
                value={newAccount.role} 
                onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                disabled={isCreatingAccount}
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <div className="modal-actions">
              <button 
                onClick={handleCreateAccount} 
                disabled={isCreatingAccount}
                style={{ opacity: isCreatingAccount ? 0.6 : 1 }}
              >
                {isCreatingAccount ? "⏳ Creating..." : "✅ Create Account"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setNewAccount({
                    username: "",
                    email: "",
                    password: "",
                    mobile: "",
                    role: "admin"
                  });
                }}
                disabled={isCreatingAccount}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updated Add Product Modal */}
     {showAddProductModal && (
  <div className="modal-overlay">
    <div className="modal-card">
      <h2>Add New Product</h2>
      <input
        type="text"
        placeholder="Product Name *"
        value={newProduct.name}
        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        disabled={isAddingProduct}
      />
      
      <div className="barcode-section" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        marginBottom: '10px' 
      }}>
        <input
          type="text"
          placeholder="Barcode (Unique) *"
          value={newProduct.barcode}
          onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
          disabled={isAddingProduct}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => {
            const newBarcode = generateUniqueBarcode();
            setNewProduct({ ...newProduct, barcode: newBarcode });
          }}
          disabled={isAddingProduct}
          style={{ 
            padding: '8px', 
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🏷️ Generate
        </button>
      </div>

    {newProduct.barcode && (
  <div style={{ 
    textAlign: 'center', 
    marginBottom: '15px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  }}>
    <div id="barcodeContainer">
      <canvas id="barcodeCanvas"></canvas>
      {(() => {
        try {
          JsBarcode("#barcodeCanvas", newProduct.barcode, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 10,
            background: '#ffffff'
          });
        } catch (error) {
          console.error('Error generating barcode preview:', error);
        }
        return null;
      })()}
    </div>
    <button
      onClick={() => printBarcode(newProduct.barcode)}
      style={{ 
        marginTop: '10px',
        padding: '6px 12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      🖨️ Print Barcode
    </button>
  </div>
)}

      <input
        type="text"
        placeholder="Size *"
        value={newProduct.size}
        onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
        disabled={isAddingProduct}
      />
      <input
        type="number"
        placeholder="Stock Quantity *"
        min="1"
        value={newProduct.stock}
        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
        disabled={isAddingProduct}
      />
      <input
        type="number"
        placeholder="Price *"
        min="0.01"
        step="0.01"
        value={newProduct.price}
        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
        disabled={isAddingProduct}
      />
      <textarea
        placeholder="Description (optional)"
        rows="3"
        value={newProduct.description}
        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
        disabled={isAddingProduct}
      />
      <div className="modal-actions">
        <button 
          onClick={handleAddProduct}
          disabled={isAddingProduct}
          style={{ opacity: isAddingProduct ? 0.6 : 1 }}
        >
          {isAddingProduct ? "⏳ Adding..." : "✅ Add Product"}
        </button>
        <button
          className="cancel-btn"
          onClick={() => {
            setShowAddProductModal(false);
            setNewProduct({ 
              name: "", 
              barcode: "", 
              size: "", 
              stock: 0, 
              price: 0, 
              description: "" 
            });
          }}
          disabled={isAddingProduct}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {showStockModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Update Stock</h2>
            <select
              onChange={(e) =>
                setStockUpdate({ ...stockUpdate, id: parseInt(e.target.value) })
              }
            >
              <option value="">Select Product</option>
              {products && products.length > 0 && products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.barcode} ({p.size})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Additional Stock Quantity"
              value={stockUpdate.quantity}
              onChange={(e) =>
                setStockUpdate({ ...stockUpdate, quantity: e.target.value })
              }
            />
            <div className="modal-actions">
              <button 
                onClick={handleUpdateStockAPI}
                disabled={isUpdatingStock}
                style={{ opacity: isUpdatingStock ? 0.6 : 1 }}
              >
                {isUpdatingStock ? "⏳ Updating..." : "✅ Update Stock "}
              </button>
              
              <button
                className="cancel-btn"
                onClick={() => setShowStockModal(false)}
                disabled={isUpdatingStock}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Customer Details</h2>
            <input
              type="text"
              placeholder="Customer Name"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Mobile Number"
              value={customer.mobile}
              onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
            />
            <input
              type="text"
              placeholder="Customer GSTIN (optional)"
              value={customer.gstin}
              onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
            />
            <label>
              Billing Type:{" "}
              <select value={gstOption} onChange={(e) => setGstOption(e.target.value)}>
                <option value="with">With GST</option>
                <option value="without">Without GST</option>
              </select>
            </label>
            <label>
              Discount:{" "}
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="none">No Discount</option>
                <option value="5%">5% Discount</option>
                <option value="10%">10% Discount</option>
                <option value="custom">Custom Amount</option>
              </select>
            </label>
            {discountType === "custom" && (
              <input
                type="number"
                placeholder="Enter discount amount (₹)"
                value={customDiscount}
                onChange={(e) => setCustomDiscount(e.target.value)}
                min="0"
              />
            )}
            <div className="modal-actions">
              <button onClick={generateBill}>✅ Generate Bill</button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBill && (
        <div className="bill-card">
          <h2>Invoice Preview</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>₹{item.price}</td>
                  <td>₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="bill-summary">
            <p><strong>Sub Total: ₹{grandTotal.toFixed(2)}</strong></p>
            {discountAmount > 0 && (
              <p style={{color: 'green'}}>
                <strong>- Discount {discountType === 'custom' ? '' : `(${discountType})`}: ₹{discountAmount.toFixed(2)}</strong>
              </p>
            )}
            {gstOption === "with" && (
              <p><strong>+ GST (5%): ₹{gstAmount.toFixed(2)}</strong></p>
            )}
            <p style={{fontSize: '18px', borderTop: '2px solid #333', paddingTop: '5px'}}>
              <strong>Final Amount: ₹{finalTotal.toFixed(2)}</strong>
            </p>
          </div>
          
          <button className="export-btn" onClick={exportPDF}>
            📥 Download PDF
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductDetailsModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Product Details</h2>
            {isLoadingSingleProduct ? (
              <div className="loading">Loading product details...</div>
            ) : selectedProduct ? (
              <div className="product-details">
                <p><strong>ID:</strong> {selectedProduct.id}</p>
                <p><strong>Name:</strong> {selectedProduct.name}</p>
                <p><strong>Barcode:</strong> {selectedProduct.barcode}</p>
                <p><strong>Size:</strong> {selectedProduct.size}</p>
                <p><strong>Stock:</strong> {selectedProduct.stock}</p>
                <p><strong>Price:</strong> ₹{selectedProduct.price}</p>
                {selectedProduct.description && (
                  <p><strong>Description:</strong> {selectedProduct.description}</p>
                )}
                {selectedProduct.created_by && (
                  <p><strong>Created By:</strong> User ID {selectedProduct.created_by}</p>
                )}
                {selectedProduct.created_at && (
                  <p><strong>Created At:</strong> {new Date(selectedProduct.created_at).toLocaleString()}</p>
                )}
                {selectedProduct.updated_at && (
                  <p><strong>Updated At:</strong> {new Date(selectedProduct.updated_at).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <div className="error">Failed to load product details</div>
            )}
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowProductDetailsModal(false);
                  setSelectedProduct(null);
                }}
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;