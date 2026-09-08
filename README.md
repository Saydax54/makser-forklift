# Service Flow

Forklift servis atölyemiz için sadece "İş Emri ve Saha Takibi" odaklı, modern ve mobil uyumlu bir web uygulaması (SPA) geliştirmeni istiyorum. Stok ve yedek parça takibi OLMAYACAK. Sistemde 3 farklı rol olacak: Yönetici (Atölye Sahibi), Saha Teknisyeni ve Müşteri.

Uygulamanın Temel Özellikleri ve Ekranları:

1. Veritabanı Yapısı:

- Müşteriler (İsim, Telefon, E-posta, Adres, Forklift Marka/Model/Seri No)

- Teknisyenler (Ad Soyad, Telefon, Durum: Müsait/Görevde)

- İş Emirleri (Müşteri, Teknisyen, Arıza Tanımı, Durum: Bekliyor/Devam Ediyor/Tamamlandı, Servis Notu, Dijital İmza Görseli, Oluşturulma Tarihi, Tamamlanma Tarihi)

2. Yönetici Paneli (Dashboard):

- Yeni İş Emri Oluşturma: İş emri oluştururken kayıtlı müşterilerden biri seçilebilmeli VEYA "Yeni Müşteri Ekle" butonuyla anında yeni müşteri bilgileri girilebilmeli.

- Arıza tanımı yazılmalı ve sistemdeki müsait teknisyenlerden biri seçilerek iş atanmalı.

- Devam eden ve tamamlanan işlerin durumları bir liste veya Kanban tablosu şeklinde takip edilebilmeli.

3. Teknisyen Mobil Paneli:

- Teknisyen kendi kullanıcı adıyla girdiğinde sadece kendine atanan işleri görecek.

- İşe başladığında iş durumunu "Devam Ediyor" yapacak.

- İş bittiğinde bir "Servis Formu Doldur" alanı açılacak. Teknisyen buraya yapılan işlemleri (Servis Notu) yazacak.

- Hemen altında dokunmatik ekrandan müşterinin parmağıyla imza atabileceği bir "Dijital İmza (Canvas)" alanı olacak.

4. Otomatik PDF ve Gönderim:

- Teknisyen işi bitirip müşteri imzasını alıp "Onayla ve Kapat" butonuna bastığında sistem arka planda otomatik olarak şık bir "Teknik Servis Formu" PDF'i üretecek.

- Bu PDF'te: Atölye logosu/bilgileri, müşteri ve forklift bilgileri, arıza tanımı, teknisyen notu ve müşterinin dijital imzası yer alacak.

- Sistem bu PDF'i otomatik olarak müşterinin e-posta adresine gönderecek (veya ekranda "Müşteriye WhatsApp'tan Gönder" linki üretecek).

Arayüz için Tailwind CSS ve modern, temiz bir tasarım kullan. Mobil öncelikli (responsive) olsun çünkü teknisyenler sahada telefondan kullanacak.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://makser-forklift.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9540f6cf-bb08-4f8c-9b48-bba4be35bac1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
