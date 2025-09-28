import React, { useState, useEffect } from 'react';
import './SalesmanManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function SalesmanManagement({ products, updateProductStock, onClose }) {
  const [salesmanName, setSalesmanName] = useState('');
  const [salesmanMobile, setSalesmanMobile] = useState('');
  const [activeTab, setActiveTab] = useState('take'); // 'take' or 'return'
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [takenProducts, setTakenProducts] = useState([]);

  // Load taken products from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('takenProducts');
    if (saved) setTakenProducts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('takenProducts', JSON.stringify(takenProducts));
  }, [takenProducts]);

  // Product selection for taking
  const handleProductSelect = (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === productId);
      if (existing) {
        if (quantity === 0) return prev.filter(p => p.id !== productId);
        return prev.map(p => p.id === productId ? { ...p, quantity: parseInt(quantity) } : p);
      } else if (quantity > 0) {
        return [...prev, { id: productId, name: product.name, price: product.price, quantity: parseInt(quantity), maxAvailable: product.stock }];
      }
      return prev;
    });
  };

  // Assign products to salesman
  const handleTakeProducts = async () => {
    if (!salesmanName.trim() || !salesmanMobile.trim()) {
      alert('Please enter salesman name and mobile number!');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('Please select at least one product!');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(salesmanMobile)) {
      alert('Please enter a valid 10-digit mobile number!');
      return;
    }

    // Check stock availability
    for (let selected of selectedProducts) {
      const product = products.find(p => p.id === selected.id);
      if (!product || product.stock < selected.quantity) {
        alert(`Insufficient stock for ${selected.name}! Available: ${product?.stock || 0}`);
        return;
      }
    }

    // Backend API call
    try {
      const response = await fetch(`${API_BASE_URL}/api/salesman/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesmanName, salesmanMobile, products: selectedProducts })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Error assigning products.');
        return;
      }
    } catch (err) {
      console.error('API Error:', err);
      alert('Network error. Cannot assign products.');
      return;
    }

    // Update stock locally
    selectedProducts.forEach(p => updateProductStock(p.id, -p.quantity));

    const transaction = {
      id: Date.now(),
      salesmanName,
      salesmanMobile,
      products: selectedProducts.map(p => ({ ...p })),
      takeDate: new Date().toISOString(),
      takeTime: new Date().toLocaleTimeString(),
      status: 'taken',
      totalValue: selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0),
    };

    setTakenProducts(prev => [...prev, transaction]);
    setSalesmanName('');
    setSalesmanMobile('');
    setSelectedProducts([]);

    alert(`Products successfully assigned to ${salesmanName}!`);
  };

  // Return products
  const handleReturnProducts = async (transactionId, returnProducts) => {
    if (returnProducts.length === 0) {
      alert('Please select products to return!');
      return;
    }

    // Backend API call
    try {
      const response = await fetch(`${API_BASE_URL}/api/salesman/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, returnProducts })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Error returning products.');
        return;
      }
    } catch (err) {
      console.error('API Error:', err);
      alert('Network error. Cannot return products.');
      return;
    }

    // Update stock locally
    returnProducts.forEach(p => updateProductStock(p.id, p.quantity));

    // Update transaction
    setTakenProducts(prev =>
      prev.map(transaction => {
        if (transaction.id === transactionId) {
          const remainingProducts = transaction.products.filter(p => !returnProducts.find(r => r.id === p.id));
          return {
            ...transaction,
            products: remainingProducts,
            status: remainingProducts.length === 0 ? 'returned' : 'partial_return',
            returnDate: new Date().toISOString(),
            returnTime: new Date().toLocaleTimeString(),
            returnedProducts: [...(transaction.returnedProducts || []), ...returnProducts]
          };
        }
        return transaction;
      })
    );

    alert('Products returned successfully!');
  };

  // Return Product Form component
  const ReturnProductForm = ({ transaction }) => {
    const [returnProducts, setReturnProducts] = useState([]);

    const handleReturnSelect = (productId, quantity) => {
      const product = transaction.products.find(p => p.id === productId);
      if (!product) return;

      setReturnProducts(prev => {
        const existing = prev.find(p => p.id === productId);
        if (existing) {
          if (quantity === 0) return prev.filter(p => p.id !== productId);
          return prev.map(p => p.id === productId ? { ...p, quantity: parseInt(quantity) } : p);
        } else if (quantity > 0) {
          return [...prev, { id: productId, name: product.name, price: product.price, quantity: parseInt(quantity) }];
        }
        return prev;
      });
    };

    return (
      <div className="return-form">
        <h4>Return Products for {transaction.salesmanName}</h4>
        <div className="return-products-grid">
          {transaction.products.map(product => (
            <div key={product.id} className="return-product-card">
              <h5>{product.name}</h5>
              <p>Taken: {product.quantity}</p>
              <p>Price: ₹{product.price}</p>
              <div className="return-quantity-selector">
                <label>Return Qty:</label>
                <input
                  type="number"
                  min="0"
                  max={product.quantity}
                  onChange={(e) => handleReturnSelect(product.id, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="return-btn" onClick={() => handleReturnProducts(transaction.id, returnProducts)}>
          ↩️ Return Selected Products
        </button>
      </div>
    );
  };

  return (
    <div className="salesman-management-overlay">
      <div className="salesman-management-card">
        <div className="management-header">
          <h2>📦 Salesman Product Management</h2>
          <button className="close-btn" onClick={onClose}>✖️</button>
        </div>

        <div className="tab-buttons">
          <button className={`tab-btn ${activeTab === 'take' ? 'active' : ''}`} onClick={() => setActiveTab('take')}>
            🌅 Morning Take Product
          </button>
          <button className={`tab-btn ${activeTab === 'return' ? 'active' : ''}`} onClick={() => setActiveTab('return')}>
            🌆 Evening Return Product
          </button>
        </div>

        {activeTab === 'take' && (
          <div className="take-section">
            <h3>Products Assignment</h3>
            <div className="salesman-info">
              <input type="text" placeholder="Salesman Name *" value={salesmanName} onChange={(e) => setSalesmanName(e.target.value)} />
              <input type="tel" placeholder="Mobile Number (10 digits) *" value={salesmanMobile} maxLength="10" onChange={(e) => setSalesmanMobile(e.target.value.replace(/\D/g, ''))} />
            </div>

            <div className="products-selection">
              <h4>Select Products:</h4>
              <div className="products-grid">
                {products.filter(p => p.stock > 0).map(product => (
                  <div key={product.id} className="product-select-card">
                    <h5>{product.name}</h5>
                    <p>Available: {product.stock}</p>
                    <p>Price: ₹{product.price}</p>
                    <div className="quantity-selector">
                      <label>Quantity:</label>
                      <input type="number" min="0" max={product.stock} onChange={(e) => handleProductSelect(product.id, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="selected-summary">
                <h4>Selected Products:</h4>
                {selectedProducts.map(p => (
                  <div key={p.id} className="selected-item">{p.name} - Qty: {p.quantity} - Total: ₹{p.price * p.quantity}</div>
                ))}
                <div className="total-value">
                  <strong>Total Value: ₹{selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)}</strong>
                </div>
              </div>
            )}

            <button className="take-products-btn" onClick={handleTakeProducts}>
              ✅ Assign Products to Salesman
            </button>
          </div>
        )}

        {activeTab === 'return' && (
          <div className="return-section">
            <h3>Product Returns</h3>
            {takenProducts.filter(t => t.status === 'taken' || t.status === 'partial_return').length === 0 ? (
              <div className="no-transactions"><p>No pending returns found.</p></div>
            ) : (
              <div className="transactions-list">
                {takenProducts.filter(t => t.status === 'taken' || t.status === 'partial_return').map(transaction => (
                  <div key={transaction.id} className="transaction-card">
                    <div className="transaction-header">
                      <h4>{transaction.salesmanName}</h4>
                      <span className="transaction-status">{transaction.status}</span>
                    </div>
                    <div className="transaction-details">
                      <p>Mobile: {transaction.salesmanMobile}</p>
                      <p>Take Date: {new Date(transaction.takeDate).toLocaleDateString()}</p>
                      <p>Take Time: {transaction.takeTime}</p>
                      <p>Total Value: ₹{transaction.totalValue}</p>
                    </div>
                    {transaction.products.length > 0 && <ReturnProductForm transaction={transaction} />}
                  </div>
                ))}
              </div>
            )}

            <div className="completed-returns">
              <h4>📋 Completed Returns History</h4>
              {takenProducts.filter(t => t.status === 'returned').map(transaction => (
                <div key={transaction.id} className="completed-transaction">
                  <div className="completed-header">
                    <span>{transaction.salesmanName}</span>
                    <span className="completed-status">✅ Returned</span>
                  </div>
                  <div className="completed-details">
                    <p>Return Date: {new Date(transaction.returnDate).toLocaleDateString()}</p>
                    <p>Return Time: {transaction.returnTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesmanManagement;
