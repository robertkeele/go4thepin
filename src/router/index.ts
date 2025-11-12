import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rounds/enter',
      name: 'enter-score',
      component: () => import('@/pages/rounds/EnterScorePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rounds/history',
      name: 'rounds-history',
      component: () => import('@/pages/rounds/RoundsHistoryPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/profile/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('@/pages/events/EventsListPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/events/create',
      name: 'create-event',
      component: () => import('@/pages/events/CreateEventPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/events/:id',
      name: 'event-detail',
      component: () => import('@/pages/events/EventDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/courses',
      name: 'courses',
      component: () => import('@/pages/courses/CoursesListPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/courses/create',
      name: 'create-course',
      component: () => import('@/pages/courses/CreateCoursePage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/courses/:id',
      name: 'course-detail',
      component: () => import('@/pages/courses/CourseDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/pages/admin/UsersManagementPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Initialize auth if not already done
  if (!authStore.initialized) {
    await authStore.initializeAuth()
  }

  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest
  const requiresAdmin = to.meta.requiresAdmin
  const isAuthenticated = authStore.isAuthenticated

  // If route requires authentication and user is not authenticated
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // If route requires admin and user is not admin
  if (requiresAdmin && !authStore.isAdmin) {
    next({ name: 'dashboard' })
    return
  }

  // If route requires guest (login/register) and user is authenticated
  if (requiresGuest && isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
