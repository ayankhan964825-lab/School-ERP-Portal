import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api from '../../utils/api';
import { supabase } from '../../utils/supabase';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    fetchDeliveryDetails();
    return () => stopTracking(); // Cleanup on unmount
  }, [id]);

  useEffect(() => {
    if (delivery?.rider_status === 'out_for_delivery') {
      startTracking();
    } else {
      stopTracking();
    }
  }, [delivery?.rider_status]);

  const startTracking = async () => {
    if (locationSubRef.current) return; // Already tracking

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }

    const channel = supabase.channel(`tracking_${id}`);
    
    // Subscribe to the channel (we only send, but we must connect)
    channel.subscribe((status) => {
      console.log('Realtime tracking status:', status);
    });

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        channel.send({
          type: 'broadcast',
          event: 'location_update',
          payload: { latitude, longitude, timestamp: Date.now() },
        });
      }
    );
  };

  const stopTracking = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    supabase.removeChannel(supabase.channel(`tracking_${id}`));
  };

  const fetchDeliveryDetails = async () => {
    try {
      const response = await api.get('/rider/pending-deliveries');
      if (response.data.deliveries) {
        const item = response.data.deliveries.find((d: any) => d.id === id);
        if (item) setDelivery(item);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openMap = () => {
    if (!delivery?.customer?.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${delivery.customer.address}, ${delivery.customer.pincode}`
    )}`;
    Linking.openURL(url);
  };

  const callCustomer = () => {
    if (!delivery?.customer?.phone) return;
    Linking.openURL(`tel:${delivery.customer.phone}`);
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.post('/rider/update-status', {
        fulfillmentId: id,
        newStatus,
      });
      setDelivery({ ...delivery, rider_status: newStatus });
      if (newStatus === 'delivered') {
        Alert.alert('Success', 'Delivery marked as completed!');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const renderActionButtons = () => {
    switch (delivery?.rider_status) {
      case 'assigned':
        return (
          <TouchableOpacity style={[styles.actionBtn, styles.btnPurple]} onPress={() => updateStatus('at_store')} disabled={updating}>
            <Text style={styles.actionBtnText}>{updating ? 'Updating...' : 'Reached Hub (At Store)'}</Text>
          </TouchableOpacity>
        );
      case 'at_store':
        return (
          <TouchableOpacity style={[styles.actionBtn, styles.btnOrange]} onPress={() => updateStatus('out_for_delivery')} disabled={updating}>
            <Text style={styles.actionBtnText}>{updating ? 'Updating...' : 'Picked Up (Out for Delivery)'}</Text>
          </TouchableOpacity>
        );
      case 'out_for_delivery':
        return (
          <TouchableOpacity style={[styles.actionBtn, styles.btnGreen]} onPress={() => updateStatus('delivered')} disabled={updating}>
            <Text style={styles.actionBtnText}>{updating ? 'Updating...' : 'Mark as Delivered'}</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  if (loading || !delivery) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order #{delivery.order_id.substring(0,8).toUpperCase()}</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>Current Status: {delivery.rider_status.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>

        {/* Customer Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Details</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Name:</Text> {delivery.customer?.name}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Address:</Text> {delivery.customer?.address}, {delivery.customer?.pincode}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Payment:</Text> {delivery.payment_method}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Amount:</Text> ₹{delivery.total_amount}</Text>
          
          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.iconBtn} onPress={openMap}>
              <Text style={styles.iconBtnText}>📍 Open Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnBlue]} onPress={callCustomer}>
              <Text style={styles.iconBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({delivery.items?.length})</Text>
          {delivery.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.product_name || item.variant || item.id}</Text>
            </View>
          ))}
        </View>
        
      </ScrollView>

      <View style={styles.footer}>
        {renderActionButtons()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingTop: 40 },
  backBtn: { padding: 8, marginRight: 12, backgroundColor: '#fff', borderRadius: 8 },
  backText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  statusBanner: { backgroundColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  cardText: { fontSize: 14, color: '#334155', marginBottom: 8 },
  bold: { fontWeight: '600', color: '#1e293b' },
  rowButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  iconBtn: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, alignItems: 'center' },
  iconBtnBlue: { backgroundColor: '#eff6ff' },
  iconBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemQty: { width: 30, fontSize: 14, fontWeight: 'bold', color: '#6366f1' },
  itemName: { flex: 1, fontSize: 14, color: '#334155' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  actionBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnPurple: { backgroundColor: '#8b5cf6' },
  btnOrange: { backgroundColor: '#f59e0b' },
  btnGreen: { backgroundColor: '#10b981' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
