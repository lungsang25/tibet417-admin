import axios from 'axios'
import { backendUrl } from '../App'

/**
 * Status list + carrier registry, served by the backend so the admin panel
 * never holds a second copy of them. Adding a carrier is then a backend-only
 * deploy instead of a two-repo release.
 *
 * The promise (not the resolved value) is cached in module scope, so ten order
 * cards mounting at once share a single request, and navigating back to the
 * page does not refetch a list that only changes on deploy.
 */
let inflight = null

// A static list failing to load must not make the page unusable: statuses fall
// back to the known five, and the carrier select simply reports itself
// unavailable while Save stays disabled.
const FALLBACK = {
    statuses: ['Order Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered'],
    carriers: [],
}

export const getOrderMeta = () => {
    if (!inflight) {
        inflight = axios
            .get(backendUrl + '/api/order/meta')
            .then((res) => (res.data?.success
                ? { statuses: res.data.statuses, carriers: res.data.carriers }
                : FALLBACK))
            .catch(() => {
                inflight = null   // allow a later mount to retry
                return FALLBACK
            })
    }
    return inflight
}
