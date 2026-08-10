const buildVisitorsOverTime = () => {
  const data = []
  const today = new Date()
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const base = 180 + Math.sin(i / 3) * 60
    const noise = Math.floor(Math.random() * 40)
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      users: Math.max(20, Math.round(base + noise)),
    })
  }
  return data
}

// TODO: replace with a real GA4 Data API call once analytics is linked.
export const getAnalyticsOverview = () => {
  return {
    stats: {
      users: { value: 8421, change: 12.4 },
      sessions: { value: 11532, change: 8.1 },
      pageviews: { value: 24890, change: -3.2 },
      bounceRate: { value: 42.7, change: -5.6 },
    },
    visitorsOverTime: buildVisitorsOverTime(),
    topPages: [
      { path: '/collection', views: 5230, avgTime: '2m 14s' },
      { path: '/', views: 4110, avgTime: '1m 42s' },
      { path: '/product/thangka-wall-art', views: 2870, avgTime: '3m 05s' },
      { path: '/about', views: 1540, avgTime: '1m 10s' },
      { path: '/contact', views: 980, avgTime: '0m 58s' },
    ],
  }
}
