import React from 'react';

const IslamicQuotes: React.FC = () => {
  const quotes = [
    {
      text: "Apabila kalian melintasi taman-taman syurga, maka singgahlah.\" Para sahabat bertanya: \"Apa itu taman-taman syurga, wahai Rasulullah?\" Baginda menjawab: \"Majlis-majlis zikir (ilmu).\"",
      source: "(HR. Tirmidzi)"
    },
    {
      text: "Sesungguhnya para malaikat membentangkan sayapnya bagi penuntut ilmu, kerana reda terhadap apa yang dia lakukan.",
      source: "(HR. Abu Daud)"
    },
    {
      text: "Barang siapa menempuh suatu jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju syurga.",
      source: "(HR. Muslim)"
    }
  ];

  return (
    <section className="py-0 px-6 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-0">
          
         
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {quotes.map((quote, index) => {
            return (
              <div
              key={index}
              className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-500 transform hover:-translate-y-1 group"
            >
              <div className="text-center mb-0">
                <div className="inline-flex p-4 rounded-2xl transition-all duration-300">
                  <img src="/kubahgreennew.png" alt="kubahgreennew.png" className="w-10 h-10" />
                </div>
              </div>
              <blockquote className="text-gray-700 text-center leading-relaxed mb-1 font-light text-sm">
                "{quote.text}"
              </blockquote>
              <cite className="text-emerald-600 text-xs text-center block font-medium">
                {quote.source}
              </cite>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default IslamicQuotes;