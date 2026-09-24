# 📶 Wi-Fi Sinyal Simülatörü ve Isı Haritası (Wi-Fi Heatmap Simulator)

Evinizin veya ofisinizin krokisini çizerek, modemin konumuna ve duvar materyallerine göre **gerçek zamanlı Wi-Fi kapsama alanı ısı haritasını (heatmap)** analiz edebileceğiniz interaktif, tarayıcı tabanlı bir RF simülasyon aracıdır.

## 🌟 Özellikler

- **Gerçekçi RF (Radyo Frekansı) Simülasyonu:** Duvarların materyallerine (Betonarme, Tuğla, Alçıpan, Cam vb.) göre fiziksel sinyal zayıflamasını (-dB kayıp) ve 2.4 / 5 GHz farklılıklarını hesaplar.
- **İnteraktif Çizim Araçları (Kroki Çizim):** Kendi kat planınızı anında çizin. Duvarlar ekleyin, modemleri konumlandırın.
- **Çokgen (Polygon) Oda Etiketleri:** Sadece bir nokta değil, istediğiniz şekil ve boyuttaki odayı nokta nokta seçerek tam bir *Alan* (Polygon) oluşturun.
- **Gerçek Güç Ortalaması (True Power Average):** Odaların içindeki ortalama sinyal gücünü logaritmik yanılgılara düşmeden, dBm değerlerini lineer mW'a çevirerek (Ekahau / iBwave standartlarında) tamamen matematiksel doğruluğa dayanarak hesaplar.
- **Canlı Fare Takibi (Live Inspector):** Harita üzerinde farenizi gezdirdiğiniz noktadaki anlık sinyal kalitesini, tahmini internet hızını (Mbps) ve gecikmeyi (Ping) fareyi takip eden bir ipucu ekranında anında görün.
- **Yapay Zeka (AI) Optimizasyon Tavsiyeleri:** Sinyalinizin düşük olduğu noktaları analiz ederek "Modemi şu noktaya alın" veya "Mesh cihazı ekleyin" gibi akıllı uyarılar sunar.
- **Dışa Aktarma:** Yaptığınız simülasyonu analizleri ile beraber PNG formatında indirip kaydedebilirsiniz.

## 🛠 Kullanılan Teknolojiler

- **HTML5 Canvas:** Çok katmanlı çizim, ışın izleme (ray-casting) tabanlı zayıflama hesaplamaları ve ısı haritası render'ı.
- **Vanilla JavaScript (ES6+):** Çerçeve (framework) bağımsız, yüksek performanslı ve reaktif RF matematik algoritmaları.
- **Vanilla CSS3:** Modern, cam efekti (glassmorphism) ve Cyberpunk dokunuşları barındıran şık, karanlık mod (dark-theme) arayüz.

## 🚀 Nasıl Kullanılır?

1. Projeyi bilgisayarınıza indirin veya `git clone` ile çekin.
2. Sadece `index.html` dosyasına çift tıklayarak modern bir tarayıcıda (Chrome, Edge, Safari vb.) açın.
3. Herhangi bir sunucu (Node.js vb.) kurulumu gerektirmez. Tamamen istemci (client-side) tarafında çalışır.

### Temel İşlemler:
- **Kroki Çizim Sekmesi:** Sol menüden Duvar tipini seçin, `Duvar Çiz` ile krokiyi oluşturun.
- **Oda Etiketi:** Çokgen şeklinde köşelere tek tek tıklayarak bir oda çizin. Başladığınız ilk noktaya tıklayarak odayı kapatın.
- **Modem / Wi-Fi Sekmesi:** 2.4Ghz veya 5Ghz seçimini, anten kazancını (Gain) ve yayın gücünü ayarlayın. Modemi haritada uygun gördüğünüz bir yere yerleştirin.
- **Simülasyon:** Anında sağ tarafta Oda Bazlı Analiz ve Kapsama Kalitesi raporlarını görüntüleyin. Fare ile gezinerek ölü noktaları (Dead Zones) test edin.

## 📄 Lisans

Bu proje MIT lisansı ile lisanslanmıştır. İstediğiniz gibi geliştirebilir, paylaşabilir veya kendi projelerinizde kullanabilirsiniz.
