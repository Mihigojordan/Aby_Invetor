import React, { useEffect, useState } from 'react'
import Header from '../components/dashboard/Header'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/dashboard/Sidebar'
import { categorySyncService } from '../services/sync/categorySyncService'
import { productSyncService } from '../services/sync/productSyncService'
import { stockInSyncService } from '../services/sync/stockInSyncService'
import { stockOutSyncService } from '../services/sync/stockOutSyncService'
import { useNetworkStatusContext } from '../context/useNetworkContext'
import { db } from '../db/database'
import backOrderService from '../services/backOrderService'
import { salesReturnSyncService } from '../services/sync/salesReturnSyncService'


const DashboardLayout = ({role}) => {
  const [isOpen, setIsOpen] = useState(false)
  const onToggle = () => {
    setIsOpen(!isOpen)
    
  }

  const locations = useLocation()


  const {isOnline} = useNetworkStatusContext()

useEffect(() => {
  const syncAll = async () => {
    try {
      // Run in parallel, don't block one by one
      await Promise.all([
        categorySyncService.syncCategories(),
        productSyncService.syncProducts(),
        stockInSyncService.syncStockIns(),
        stockOutSyncService.syncStockOuts(),
        salesReturnSyncService.syncSalesReturns(),
      ])
      console.log("✅ Sync complete")
    } catch (err) {
      console.error("❌ Sync failed", err)
    }
  }

  if (isOnline) {
    syncAll()
  }
}, [isOnline]) // re-run if connection status changes

useEffect(() => {
  const fetchAll = async () => {
    try {
      await Promise.all([
        categorySyncService.fetchAndUpdateLocal(),
        productSyncService.fetchAndUpdateLocal(),
        stockInSyncService.fetchAndUpdateLocal(),
        stockOutSyncService.fetchAndUpdateLocal(),
        stockOutServiceBackorders(),
        salesReturnSyncService.fetchAndUpdateLocal(),
      ])
      console.log("✅ Fetched server data")
    } catch (err) {
      console.error("❌ Fetch failed", err)
    }
  }

  if (isOnline) {
    fetchAll()
  }
}, [isOnline, locations.pathname]) // re-fetch when online or page changes


  const stockOutServiceBackorders = async () => {
    try {
      if (isOnline) {
        // Assuming you have a backorderService similar to productService
        const response = await backOrderService.getAllBackOrders();
        await db.backorders_all.clear()

        for (const b of response.backorders || response) {

          await db.backorders_all.put({
            id: b.id,
            quantity: b.quantity,
            soldPrice: b.soldPrice,
            productName: b.productName,
            adminId: b.adminId,
            employeeId: b.employeeId,
            lastModified: b.lastModified || new Date(),
            createdAt: b.createdAt || new Date(),
            updatedAt: b.updatedAt || new Date()
          });
        }
        // 3. Merge all data (works offline too)


      }

      const [allBackOrder, offlineAdds] = await Promise.all([
        db.backorders_all.toArray(),
        db.backorders_offline_add.toArray(),

      ]);

      const combinedBackOrder = allBackOrder

        .map(c => ({
          ...c,
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);
      console.warn('backend', combinedBackOrder);

      return combinedBackOrder;

    } catch (error) {
      console.error('Error stockOutServiceing backorders:', error);

      // Fallback: return local cache if API fails or offline
      if (!error?.response) {

        const [allBackOrder, offlineAdds] = await Promise.all([
          db.backorders_all.toArray(),
          db.backorders_offline_add.toArray(),

        ]);

        const combinedBackOrder = allBackOrder

          .map(c => ({
            ...c,
            synced: true
          }))
          .concat(offlineAdds.map(a => ({ ...a, synced: false })))
          .sort((a, b) => a.synced - b.synced);
        console.warn('backend', combinedBackOrder);

        return combinedBackOrder;

      }
    }
  };

  return (
    <div className='flex items-start  min-h-screen w-screen'>
      <Sidebar onToggle={onToggle} role={role} isOpen={isOpen} />
      <div className="min-h-screen max-h-screen  w-full lg:w-10/12 bg-gray-50">
        <Header onToggle={onToggle} role={role} />
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout