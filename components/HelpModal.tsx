
import React, { useState } from 'react';
import Modal from './Modal';
import { TruckIcon, ArrowUpOnSquareIcon, ArchiveBoxIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('inventory');

  const tabs = [
    { key: 'inventory', name: '在庫分析ガイド', icon: ArchiveBoxIcon },
    { key: 'intake', name: '入庫分析ガイド', icon: TruckIcon },
    { key: 'outbound', name: '出庫分析ガイド', icon: ArrowUpOnSquareIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-semibold text-base text-gray-800">ダッシュボードの各在庫指標を理解し、効率的な在庫管理に役立てましょう。</p>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-blue-800">総在庫評価額</h4>
              <p><code>(各商品の原価 × 現在庫数)</code> の全商品合計です。サロンの資産価値を示す重要な指標となります。</p>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg">
              <h4 className="font-bold text-red-800">不良在庫金額</h4>
              <p>6ヶ月以上入出庫の動きがない商品の在庫金額の合計です。この金額が高いほど、キャッシュフローが悪化している可能性があります。</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-bold text-green-800">在庫回転率</h4>
              <p>在庫がどれだけ効率的に出庫（売上）に変わっているかを示す指標です。<code>[ (直近3ヶ月の出庫金額 × 4) / 総在庫評価額 ]</code>で年率換算しています。数値が高いほど、資本が効率的に使われていることを意味します。</p>
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg">
              <h4 className="font-bold text-indigo-800">カテゴリ別ポートフォリオ分析</h4>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><strong className="font-semibold">ブロックの大きさ:</strong> そのカテゴリの在庫が、総在庫金額のうちどれくらいの割合を占めるかを示します。</li>
                <li><strong className="font-semibold">ブロックの色:</strong> 在庫の回転率を表します。緑色が濃いほど回転率が高く（よく動いている）、赤色に近いほど回転率が低い（動きが鈍い）ことを示します。</li>
                <li className="mt-2 pt-2 border-t border-indigo-200"><strong className="font-semibold text-indigo-900">活用法:</strong> 「ブロックが大きくて色が薄い（赤色系）」カテゴリは、過剰在庫のリスクがあるため、発注を抑えるなどの対策が考えられます。</li>
              </ul>
            </div>
             <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-800">その他の指標</h4>
                 <ul className="list-disc list-inside space-y-1 mt-1">
                     <li><strong className="font-semibold">在庫推移:</strong> 過去6ヶ月間の入庫数と出庫数の推移です。季節需要の把握や、将来の在庫計画に役立ちます。</li>
                     <li><strong className="font-semibold">人気商品ランキング:</strong> 当月、最も出庫数が多かった商品のトップ5です。売れ筋商品を把握できます。</li>
                     <li><strong className="font-semibold">要注意在庫リスト:</strong> 「不良在庫」と「過剰在庫」を具体的にリストアップし、対策を促します。</li>
                 </ul>
            </div>
          </div>
        );
      case 'intake':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-semibold text-base text-gray-800">入庫（仕入れ）に関する指標と、効率的な入荷処理の方法について説明します。</p>

             <div className="p-3 bg-sky-50 rounded-lg">
              <h4 className="font-bold text-sky-800">当月入庫アイテム数</h4>
              <p>今月、実際に入荷処理が完了した商品の「総数」です。仕入れ活動の規模を把握できます。</p>
            </div>
             <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-800">在庫推移グラフでの見方</h4>
              <p>グラフの青い線が入庫数を示します。出庫数（赤い線）との差を見ることで、在庫が純増しているか純減しているかが分かります。</p>
            </div>
             <div className="p-3 bg-teal-50 rounded-lg">
                <h4 className="font-bold text-teal-800">効率的な入荷処理の方法</h4>
                <p className="font-semibold mt-2">入荷処理ページでは、2つの主要な方法で入荷を記録できます。</p>
                 <ul className="list-decimal list-inside space-y-2 mt-2 pl-2">
                     <li><strong className="font-semibold">AI納品書一括登録:</strong> 紙の納品書をスマホで撮影し、画像をアップロードするだけで、AIが品名や数量を自動で読み取ります。新規商品もその場で登録でき、大幅な時間短縮になります。手書きや複雑なレイアウトの納品書に最適です。</li>
                     <li><strong className="font-semibold">バーコードによる一括入荷:</strong> ハンディスキャナやPCのカメラで商品のバーコードを連続スキャンするだけで、簡単に入荷リストを作成できます。定期的な入荷作業や、すでにシステムに登録済みの商品を素早く処理する場合に最適です。</li>
                 </ul>
            </div>
          </div>
        );
      case 'outbound':
        return (
          <div className="space-y-4 text-sm text-gray-700">
             <p className="font-semibold text-base text-gray-800">出庫（お客様への販売や施術での使用）に関する指標と、簡単な出庫処理の方法を説明します。</p>

             <div className="p-3 bg-rose-50 rounded-lg">
              <h4 className="font-bold text-rose-800">当月出庫アイテム数</h4>
              <p>今月、出庫処理された商品の「総数」です。サロンの売上規模と相関する重要な指標です。</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-800">人気商品ランキング</h4>
              <p>この出庫データに基づき、どの商品がお客様に最も支持されているかを可視化します。在庫補充の優先順位付けや、販促活動のヒントになります。</p>
            </div>

             <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-bold text-purple-800">簡単な出庫処理の方法</h4>
                 <ul className="list-decimal list-inside space-y-2 mt-2 pl-2">
                     <li><strong>出庫処理ページを開く:</strong> まず、出庫作業を行う担当者を選択します。</li>
                     <li><strong>バーコードをスキャン:</strong> 出庫する商品のバーコードをスキャンすると、自動的にリストに追加されます。</li>
                     <li><strong>数量の自動カウント:</strong> 同じ商品を再度スキャンすると、数量が1つずつ増えていきます。手入力での数量変更も可能です。</li>
                     <li><strong>完了ボタンを押す:</strong> リストの内容を確認し、「出庫を完了する」ボタンを押すと、リアルタイムで在庫数が更新され、処理が完了します。</li>
                 </ul>
            </div>

          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ダッシュボード分析ガイド" contentClassName="max-w-3xl">
        <div className="flex border-b border-gray-200">
            {tabs.map(tab => (
            <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === tab.key
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
            </button>
            ))}
        </div>
        <div className="p-6 bg-gray-50 rounded-b-lg">
            {renderContent()}
        </div>
        <div className="mt-6 flex justify-end">
            <button
            onClick={onClose}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
            <CheckCircleIcon className="h-5 w-5" />
            閉じる
            </button>
      </div>
    </Modal>
  );
};

export default HelpModal;
