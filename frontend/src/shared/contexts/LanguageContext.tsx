import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { LanguageContext, type Language } from './LanguageContextValue'

type TranslationValue = string | ((values: Record<string, string | number>) => string)

const STORAGE_KEY = 'crown-anchor-language'

const translations: Record<string, TranslationValue> = {
  'Switch to Arabic': 'التبديل إلى العربية',
  'Switch to English': 'التبديل إلى الإنكليزية',
  'The Crown & Anchor home': 'الصفحة الرئيسية لـ The Crown & Anchor',
  'MORE THAN JUST A DELIVERY APP': 'أكثر من مجرد تطبيق توصيل',
  'Open cart with {count} items': ({ count }) => `فتح السلة التي تحتوي على ${count} عناصر`,
  'Open cart': 'فتح السلة',
  'Close navigation menu': 'إغلاق قائمة التنقل',
  'Open navigation menu': 'فتح قائمة التنقل',
  Home: 'الرئيسية',
  Meals: 'الوجبات',
  Restaurants: 'المطاعم',
  Profile: 'الملف الشخصي',
  'Sign in / Log in': 'تسجيل الدخول',
  'Create account / Sign up': 'إنشاء حساب',
  'Signed in as': 'تم تسجيل الدخول باسم',
  'Log out': 'تسجيل الخروج',
  'Your cart ({count})': ({ count }) => `سلتك (${count})`,
  'Your cart is empty': 'سلتك فارغة',
  'Browse meals and add something delicious to your order.': 'تصفح الوجبات وأضف شيئًا لذيذًا إلى طلبك.',
  'Browse meals': 'تصفح الوجبات',
  'Clear cart': 'إفراغ السلة',
  each: 'للقطعة',
  Remove: 'حذف',
  Subtotal: 'المجموع الفرعي',
  'Proceed to checkout': 'متابعة الدفع',
  'WHAT ARE YOU CRAVING?': 'بماذا تشتهي؟',
  'A world of flavour awaits.': 'عالم من النكهات بانتظارك.',
  'GOOD FOOD, MADE SIMPLE': 'طعام شهي بطريقة بسيطة',
  'Your next meal is just a few steps away.': 'وجبتك القادمة على بضع خطوات فقط.',
  'A smoother way to find what you love and enjoy it wherever you are.': 'طريقة أسهل لتجد ما تحب وتستمتع به أينما كنت.',
  'Find your flavour': 'اعثر على نكهتك',
  'Explore food and discover something that sounds just right.': 'استكشف الطعام واكتشف ما يناسب ذوقك تمامًا.',
  'Choose your favourites': 'اختر مفضلاتك',
  'Take your time, explore the menu, and pick what you love.': 'خذ وقتك وتصفح القائمة واختر ما تحب.',
  'Enjoy the moment': 'استمتع باللحظة',
  'Sit back and look forward to a delicious moment.': 'استرخ واستمتع بوجبة لذيذة.',
  'Ready for something delicious?': 'هل أنت مستعد لشيء لذيذ؟',
  'Your next favourite meal is waiting to be discovered.': 'وجبتك المفضلة التالية بانتظار اكتشافها.',
  'Explore categories': 'استكشف التصنيفات',
  'Explore food': 'استكشف الطعام',
  'How it works': 'كيف يعمل التطبيق',
  'Choose featured slide': 'اختر الشريحة المميزة',
  'Previous slide': 'الشريحة السابقة',
  'Next slide': 'الشريحة التالية',
  'Email address': 'البريد الإلكتروني',
  Password: 'كلمة المرور',
  'Confirm password': 'تأكيد كلمة المرور',
  Name: 'الاسم',
  'Don’t have an account? Create one': 'ليس لديك حساب؟ أنشئ حسابًا',
  "Don't have an account? Create one": 'ليس لديك حساب؟ أنشئ حسابًا',
  'Already have an account? Sign in': 'لديك حساب بالفعل؟ سجّل الدخول',
  'Demo account: admin@test.com / 123456': 'حساب تجريبي: admin@test.com / 123456',
  'Create account': 'إنشاء حساب',
  'Sign up as': 'التسجيل بصفة',
  Customer: 'عميل',
  Restaurant: 'مطعم',
  'Order progress': 'تقدم الطلب',
  'This order was cancelled.': 'تم إلغاء هذا الطلب.',
  'No matching orders': 'لا توجد طلبات مطابقة',
  'Filters apply to the current page of results.': 'تُطبّق التصفية على الصفحة الحالية من النتائج.',
  'View details': 'عرض التفاصيل',
  Previous: 'السابق',
  Next: 'التالي',
  'From date': 'من تاريخ',
  'To date': 'إلى تاريخ',
  'Search orders': 'البحث في الطلبات',
  'Order number or meal name': 'رقم الطلب أو اسم الوجبة',
  'Filter by status': 'التصفية حسب الحالة',
  'Continue browsing': 'متابعة التصفح',
  'Almost there': 'اقتربنا من النهاية',
  'Review your details and place your order securely.': 'راجع بياناتك وأرسل طلبك بأمان.',
  'Where should we bring your order?': 'إلى أين نوصّل طلبك؟',
  'Choose a saved address': 'اختر عنوانًا محفوظًا',
  'Select saved address': 'اختر عنوانًا محفوظًا',
  'Delete selected saved address': 'حذف العنوان المحفوظ المحدد',
  'Full name': 'الاسم الكامل',
  'Phone number': 'رقم الهاتف',
  'Delivery address': 'عنوان التوصيل',
  'Street, building, floor, apartment': 'الشارع، البناء، الطابق، الشقة',
  'Save this address for next time': 'حفظ هذا العنوان للمرة القادمة',
  'Choose when you want your food.': 'اختر الوقت الذي تريده لوصول طعامك.',
  'As soon as possible': 'في أقرب وقت ممكن',
  'Schedule for later': 'جدولة لوقت لاحق',
  'Pick a time slot': 'اختر وقتًا',
  'Available time slots': 'الأوقات المتاحة',
  'Choose a time': 'اختر وقتًا',
  'Choose how you would like to pay.': 'اختر طريقة الدفع المناسبة لك.',
  'Pay when it arrives': 'ادفع عند وصول الطلب',
  'Simulated demo payment': 'دفع تجريبي محاكى',
  'Demo only: card details are validated in your browser and are never sent or saved.': 'للتجربة فقط: يتم التحقق من بيانات البطاقة في المتصفح ولا يتم إرسالها أو حفظها.',
  'Card number': 'رقم البطاقة',
  'Expiry (MM/YY)': 'انتهاء الصلاحية (شهر/سنة)',
  CVC: 'رمز الأمان CVC',
  'Order notes': 'ملاحظات الطلب',
  'Allergies, gate code, delivery instructions...': 'الحساسيات، رمز البوابة، تعليمات التوصيل...',
  'Order summary': 'ملخص الطلب',
  'Promo code': 'رمز الخصم',
  Apply: 'تطبيق',
  'Place order': 'إرسال الطلب',
  'By placing your order, you agree to our demo checkout terms.': 'بإرسال طلبك، أنت توافق على شروط الدفع التجريبية.',
  'Loading your orders...': 'جارٍ تحميل طلباتك...',
  'Your activity': 'نشاطك',
  'Keep an eye on your deliveries and revisit your favourites.': 'تابع طلباتك وعد إلى وجباتك المفضلة.',
  'All statuses': 'كل الحالات',
  'items': 'عناصر',
  'Page {page} of {total}': ({ page, total }) => `الصفحة ${page} من ${total}`,
  'Back to home': 'العودة للرئيسية',
  'Explore Meals': 'استكشف الوجبات',
  'Find your favorite meals from our restaurants.': 'اعثر على وجباتك المفضلة من مطاعمنا.',
  'Search meals': 'البحث عن الوجبات',
  'Search by meal name...': 'ابحث باسم الوجبة...',
  'Filter by restaurant': 'التصفية حسب المطعم',
  'All restaurants': 'كل المطاعم',
  'Explore Restaurants': 'استكشف المطاعم',
  'Discover local kitchens and find your next favorite meal.': 'اكتشف المطابخ المحلية واعثر على وجبتك المفضلة التالية.',
  'Search restaurants': 'البحث عن المطاعم',
  'Name or cuisine...': 'الاسم أو نوع المطبخ...',
  Cuisine: 'نوع المطبخ',
  'All cuisines': 'كل أنواع المطبخ',
  'Minimum rating': 'التقييم الأدنى',
  'Any rating': 'أي تقييم',
  'Top rated': 'الأعلى تقييمًا',
  'Fastest delivery': 'الأسرع توصيلًا',
  'Name (A–Z)': 'الاسم (أ–ي)',
  'Show open restaurants only': 'عرض المطاعم المفتوحة فقط',
  'Try again': 'حاول مرة أخرى',
  'Clear filters': 'مسح التصفية',
  'Unable to load meals': 'تعذر تحميل الوجبات',
  'Unable to load restaurants': 'تعذر تحميل المطاعم',
  'No matching meals': 'لا توجد وجبات مطابقة',
  'No matching restaurants': 'لا توجد مطاعم مطابقة',
  'Sign in': 'تسجيل الدخول',
  'Welcome back. Sign in to your account.': 'مرحبًا بعودتك. سجّل الدخول إلى حسابك.',
  'Create your account': 'أنشئ حسابك',
  'Join The Crown & Anchor.': 'انضم إلى The Crown & Anchor.',
  'Checkout': 'الدفع',
  'Delivery details': 'تفاصيل التوصيل',
  'Delivery time': 'وقت التوصيل',
  'Payment method': 'طريقة الدفع',
  'Cash on delivery': 'الدفع عند الاستلام',
  Card: 'بطاقة',
  'My orders': 'طلباتي',
  'Order tracking': 'تتبع الطلب',
  pending: 'قيد الانتظار',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  on_the_way: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغى',
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
    document.documentElement.dataset.language = language
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [direction, language])

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => current === 'en' ? 'ar' : 'en')
  }, [])

  const t = useCallback((key: string, values: Record<string, string | number> = {}) => {
    if (language === 'en') {
      return key.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
    }

    const value = translations[key]
    if (!value) return key
    if (typeof value === 'function') return value(values)
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
  }, [language])

  const contextValue = useMemo(
    () => ({ language, direction, toggleLanguage, t }),
    [direction, language, t, toggleLanguage],
  )

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>
}