import { JobCategory } from './types';

export const PLUMBING_CATEGORIES: JobCategory[] = [
  {
    id: 'general-plumber',
    title: 'Plumber',
    description: 'General plumbing services, maintenance, and diagnostics. Suitable for unspecified leaks, pressure issues, or general plumbing advice.',
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800',
    iconName: 'Wrench',
    typicalIssues: [
      'Low water pressure throughout the property',
      'Unidentified water source sounds behind walls',
      'Installation of new taps, valves, or meters',
      'General plumbing inspections and pressure testing'
    ]
  },
  {
    id: 'bathroom-kitchen',
    title: 'Bathroom & Kitchen Plumbing',
    description: 'Expert installations and repairs for all bathroom and kitchen fixtures including taps, showers, bathtubs, sinks, and dishwasher connections.',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    iconName: 'ShowerHead',
    typicalIssues: [
      'Dripping taps and leaking mixers',
      'Clogged showerheads and low shower pressure',
      'New sink installation and sealing',
      'Dishwasher or washing machine water connection leaks'
    ]
  },
  {
    id: 'blocked-toilets',
    title: 'Blocked Toilets',
    description: 'High-priority emergency clearance of obstructed toilets. We restore full flushing and drainage to prevent overflow and sanitary hazards.',
    imageUrl: 'https://images.unsplash.com/photo-1585909693684-0e53b4142701?auto=format&fit=crop&q=80&w=800',
    iconName: 'Toilet',
    typicalIssues: [
      'Toilet bowl filling with water and about to overflow',
      'Blocked main toilet sewer pipe',
      'Toilet mechanism failure (no flushing power)',
      'Leaking sewer connection seal at the base'
    ]
  },
  {
    id: 'water-pumps',
    title: 'Water pumps repair',
    description: 'Professional repair, servicing, and installation of booster pumps, borehole pumps, sump pumps, and pool circulating pumps.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
    iconName: 'Cpu',
    typicalIssues: [
      'Booster pump running continuously without shutting off',
      'Water pump humming but not pumping any water',
      'No water pressure from borehole or reservoir pump',
      'Sump pump failure leading to cellar or ground flooding'
    ]
  },
  {
    id: 'blocked-sinks',
    title: 'Blocked sinks',
    description: 'Fast clearance of blocked kitchen sinks, bathroom basins, and utility basins. Includes grease trap and U-bend cleaning.',
    imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb5ca094e5d?auto=format&fit=crop&q=80&w=800',
    iconName: 'Droplets',
    typicalIssues: [
      'Kitchen sink filled with greasy, standing water',
      'Bad odors rising from the basin drain',
      'Slow draining washbasins or laundry troughs',
      'Sewer backing up through the sink'
    ]
  },
  {
    id: 'pipe-repairs',
    title: 'Water supply Pipe Repairs',
    description: 'Immediate patching or replacement of burst pipes, copper pipes, galvanized steel, and poly-cop fittings to prevent property damage.',
    imageUrl: 'https://images.unsplash.com/photo-1542013936693-8848e5744262?auto=format&fit=crop&q=80&w=800',
    iconName: 'Activity',
    typicalIssues: [
      'Burst pipe spraying water with massive pressure',
      'Coroded joint leaking continuously in the crawlspace',
      'Main municipal pipe leak on your side of the boundary',
      'Frozen or split poly-cop water supply piping'
    ]
  },
  {
    id: 'leak-detection',
    title: 'Water Leak Detection',
    description: 'Non-invasive acoustic, thermal, and tracer gas leak detection to find hidden underground, wall, or slab leaks before they destroy structures.',
    imageUrl: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=800',
    iconName: 'Search',
    typicalIssues: [
      'Water meter spinning rapidly when all taps are closed',
      'Damp patches or mold appearing on walls or concrete floor',
      'Unexplained spike in your municipal water bill',
      'Sinking paving or damp garden patches without rain'
    ]
  }
];

export const SOUTH_AFRICAN_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape'
];
