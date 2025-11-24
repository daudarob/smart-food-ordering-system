import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      "Home": "Home",
      "Menu": "Menu",
      "Cafeterias": "Cafeterias",
      "Cart": "Cart",
      "Profile": "Profile",
      "Settings": "Settings",
      "Admin Dashboard": "Admin Dashboard",
      "Login": "Login",
      "Logout": "Logout",

      // Common
      "Welcome": "Welcome",
      "Loading": "Loading...",
      "Error": "Error",
      "Success": "Success",
      "Save": "Save",
      "Cancel": "Cancel",
      "Delete": "Delete",
      "Edit": "Edit",
      "Add": "Add",
      "Remove": "Remove",
      "Search": "Search",
      "Filter": "Filter",

      // Authentication
      "Login to your account": "Login to your account",
      "Email": "Email",
      "Password": "Password",
      "Confirm Password": "Confirm Password",
      "Name": "Name",
      "Phone": "Phone",
      "Address": "Address",
      "Login Button": "Login",
      "Register": "Register",
      "Forgot Password": "Forgot Password?",
      "Don't have an account?": "Don't have an account?",
      "Already have an account?": "Already have an account?",

      // Menu
      "Categories": "Categories",
      "All Items": "All Items",
      "Add to Cart": "Add to Cart",
      "Out of Stock": "Out of Stock",
      "Available": "Available",
      "Price": "Price",
      "Description": "Description",

      // Cart
      "Your Cart": "Your Cart",
      "Empty Cart": "Your cart is empty",
      "Total": "Total",
      "Checkout": "Checkout",
      "Continue Shopping": "Continue Shopping",
      "Quantity": "Quantity",
      "Remove Item": "Remove Item",

      // Orders
      "Order History": "Order History",
      "Order Status": "Order Status",
      "Order Total": "Order Total",
      "Order Date": "Order Date",
      "Pending": "Pending",
      "Preparing": "Preparing",
      "Ready": "Ready",
      "Completed": "Completed",
      "Cancelled": "Cancelled",

      // Admin
      "Dashboard": "Dashboard",
      "Orders": "Orders",
      "Menu Management": "Menu Management",
      "Users": "Users",
      "Analytics": "Analytics",

      // Accessibility
      "Skip to main content": "Skip to main content",
      "Go to Home page": "Go to Home page",
      "Browse menu items": "Browse menu items",
      "View available cafeterias": "View available cafeterias",
      "View shopping cart": "View shopping cart",
      "View and edit profile": "View and edit profile",
      "Application settings": "Application settings",
      "Admin dashboard": "Admin dashboard",
      "Logout from your account": "Logout from your account",
      "USIU-A Smart Food System Home": "USIU-A Smart Food System Home"
    }
  },
  sw: {
    translation: {
      // Navigation
      "Home": "Nyumbani",
      "Menu": "Menyu",
      "Cafeterias": "Mikahawa",
      "Cart": "Kikapu",
      "Profile": "Wasifu",
      "Settings": "Mipangilio",
      "Admin Dashboard": "Dashibodi ya Msimamizi",
      "Login Button": "Ingia",
      "Logout": "Toka",

      // Common
      "Welcome": "Karibu",
      "Loading": "Inapakia...",
      "Error": "Kosa",
      "Success": "Mafanikio",
      "Save": "Hifadhi",
      "Cancel": "Ghairi",
      "Delete": "Futa",
      "Edit": "Hariri",
      "Add": "Ongeza",
      "Remove": "Ondoa",
      "Search": "Tafuta",
      "Filter": "Chuja",

      // Authentication
      "Login to your account": "Ingia kwenye akaunti yako",
      "Email": "Barua pepe",
      "Password": "Nenosiri",
      "Confirm Password": "Thibitisha Nenosiri",
      "Name": "Jina",
      "Phone": "Simu",
      "Address": "Anwani",
      "Login": "Ingia",
      "Register": "Jisajili",
      "Forgot Password": "Umesahau Nenosiri?",
      "Don't have an account?": "Huna akaunti?",
      "Already have an account?": "Tayari una akaunti?",

      // Menu
      "Categories": "Kategoria",
      "All Items": "Bidhaa Zote",
      "Add to Cart": "Ongeza kwenye Kikapu",
      "Out of Stock": "Imemalizika",
      "Available": "Inapatikana",
      "Price": "Bei",
      "Description": "Maelezo",

      // Cart
      "Your Cart": "Kikapu Chako",
      "Empty Cart": "Kikapu chako ni tupu",
      "Total": "Jumla",
      "Checkout": "Lipa",
      "Continue Shopping": "Endelea Kununua",
      "Quantity": "Kiasi",
      "Remove Item": "Ondoa Bidhaa",

      // Orders
      "Order History": "Historia ya Oda",
      "Order Status": "Hali ya Oda",
      "Order Total": "Jumla ya Oda",
      "Order Date": "Tarehe ya Oda",
      "Pending": "Inasubiri",
      "Preparing": "Inatayarishwa",
      "Ready": "Tayari",
      "Completed": "Imekamilika",
      "Cancelled": "Imegairiwa",

      // Admin
      "Dashboard": "Dashibodi",
      "Orders": "Oda",
      "Menu Management": "Usimamizi wa Menyu",
      "Users": "Watumiaji",
      "Analytics": "Takwimu",

      // Accessibility
      "Skip to main content": "Ruka kwenda kwenye maudhui kuu",
      "Go to Home page": "Nenda kwenye ukurasa wa nyumbani",
      "Browse menu items": "Vinjari bidhaa za menyu",
      "View available cafeterias": "Tazama mikahawa inayopatikana",
      "View shopping cart": "Tazama kikapu cha ununuzi",
      "View and edit profile": "Tazama na hariri wasifu",
      "Application settings": "Mipangilio ya programu",
      "Admin dashboard": "Dashibodi ya msimamizi",
      "Logout from your account": "Toka kwenye akaunti yako",
      "USIU-A Smart Food System Home": "USIU-A Smart Food System Nyumbani"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false, // Disable debug in production

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;