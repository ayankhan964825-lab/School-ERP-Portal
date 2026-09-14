import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

export default function DashboardScreen() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riderName, setRiderName] = useState('');
  const router = useRouter();

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/rider/pending-deliveries');
      if (response.data.deliveries) {
        setDeliveries(response.data.deliveries);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      SecureStore.getItemAsync('rider_info').then(info => {
        if (info) setRiderName(JSON.parse(info).name);
      });
      fetchDeliveries();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('rider_token');
    await SecureStore.deleteItemAsync('rider_info');
    router.replace('/');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'assigned': return '#3b82f6';
      case 'at_store': return '#8b5cf6';
      case 'out_for_delivery': return '#f59e0b';
      case 'delivered': return '#10b981';
      default: return '#64748b';
    }
  };

  const renderDeliveryItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/delivery/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.order_id.substring(0,8).toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.rider_status) }]}>
          <Text style={styles.badgeText}>{item.rider_status.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Hub:</Text>
          <Text style={styles.locationText} numberOfLines={1}>Location #{item.location_id}</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Drop:</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {item.customer?.address || 'Customer Address'}, {item.customer?.pincode}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.itemsText}>{item.items?.length || 0} items</Text>
        <Text style={styles.amountText}>₹{item.total_amount}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {riderName}</Text>
          <Text style={styles.subtitle}>You have {deliveries.length} active tasks</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending deliveries right now.</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  logoutBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  logoutText: { fontSize: 12, fontWeight: 'bold', color: '#ef4444' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  cardBody: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationRow: { flexDirection: 'row', marginBottom: 8 },
  locationLabel: { width: 40, fontSize: 12, fontWeight: '600', color: '#64748b' },
  locationText: { flex: 1, fontSize: 12, color: '#334155' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemsText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#475569', fontWeight: 'bold' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
