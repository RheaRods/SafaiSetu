import { supabase } from '@/lib/supabase';
import type { HotspotReport, WasteCategory, UrgencyLevel } from '@/types';

export async function createHotspotReport(
  reportedBy: string,
  wardId: string | null,
  latitude: number,
  longitude: number,
  description: string,
  wasteCategory: WasteCategory,
  urgency: UrgencyLevel,
  photoUrl?: string
) {
  // Check for existing reports within 50m
  const { data: existing } = await supabase
    .from('hotspot_reports')
    .select('*')
    .eq('ward_id', wardId)
    .neq('status', 'resolved');

  let nearbyReport: HotspotReport | null = null;
  if (existing) {
    for (const report of existing as HotspotReport[]) {
      if (report.latitude && report.longitude) {
        const distance = haversineDistance(latitude, longitude, report.latitude, report.longitude);
        if (distance <= 0.05) {
          nearbyReport = report;
          break;
        }
      }
    }
  }

  if (nearbyReport) {
    const newCount = nearbyReport.recurrence_count + 1;
    const newStatus = newCount >= 3 ? 'recurring' : nearbyReport.status;
    const { data, error } = await supabase
      .from('hotspot_reports')
      .update({ recurrence_count: newCount, status: newStatus })
      .eq('id', nearbyReport.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as HotspotReport;
  }

  const { data, error } = await supabase
    .from('hotspot_reports')
    .insert({
      reported_by: reportedBy,
      ward_id: wardId,
      latitude,
      longitude,
      description,
      waste_category: wasteCategory,
      urgency,
      photo_url: photoUrl,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as HotspotReport;
}

export async function getHotspotsByWard(wardId: string) {
  const { data, error } = await supabase
    .from('hotspot_reports')
    .select('*')
    .eq('ward_id', wardId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as HotspotReport[];
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
