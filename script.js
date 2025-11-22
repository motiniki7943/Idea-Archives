document.addEventListener('DOMContentLoaded', () => {
    
    // HTMLの要素を取得
    const netaInput = document.getElementById('neta-input');
    const deadlineInput = document.getElementById('deadline-input');
    const permanentCheck = document.getElementById('permanent-check');
    const addButton = document.getElementById('add-button');
    const netaList = document.getElementById('neta-list');
    
    // バックアップ用ボタン
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFile = document.getElementById('import-file');

    // ブラウザに保存されているネタを読み込む
    let netaItems = JSON.parse(localStorage.getItem('netaDB')) || [];

    // ■ ネタをリストに表示する関数
    const renderList = () => {
        netaList.innerHTML = ''; // リストを一度空にする

        // 期限が近い順に並び替え（無期限は最後）
        netaItems.sort((a, b) => {
            if (a.isPermanent && b.isPermanent) return 0;
            if (a.isPermanent) return 1;
            if (b.isPermanent) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        const now = new Date();

        if (netaItems.length === 0) {
            netaList.innerHTML = '<li>追加されたネタはありません。</li>';
            return;
        }

        netaItems.forEach(item => {
            const li = document.createElement('li');
            
            // 情報（ネタ内容と期限）をまとめるdiv
            const infoDiv = document.createElement('div');
            infoDiv.className = 'info';

            const contentSpan = document.createElement('span');
            contentSpan.className = 'content';
            contentSpan.textContent = item.text;
            
            const deadlineSpan = document.createElement('span');
            deadlineSpan.className = 'deadline';

            if (item.isPermanent) {
                deadlineSpan.textContent = '無期限';
                deadlineSpan.classList.add('permanent');
            } else {
                const deadlineDate = new Date(item.deadline);
                deadlineSpan.textContent = deadlineDate.toLocaleDateString('ja-JP');
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (deadlineDate < today) {
                    deadlineSpan.classList.add('expired');
                }
            }
            
            infoDiv.appendChild(contentSpan);
            infoDiv.appendChild(deadlineSpan);
            
            // ▼ 削除ボタンの作成 ▼
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '削除';
            // 削除ボタンが押されたときの処理
            deleteBtn.addEventListener('click', () => {
                if (confirm(`「${item.text}」を削除しますか？`)) {
                    // item.id と一致しないものだけを残す（＝一致したものを削除）
                    netaItems = netaItems.filter(i => i.id !== item.id);
                    saveNeta();
                    renderList();
                }
            });

            li.appendChild(infoDiv); // 情報（ネタ＋期限）
            li.appendChild(deleteBtn); // 削除ボタン
            netaList.appendChild(li);
        });
    };

    // ■ ブラウザにネタを保存する関数
    const saveNeta = () => {
        localStorage.setItem('netaDB', JSON.stringify(netaItems));
    };

    // ■ 期限切れのネタを自動削除する関数
    const checkDeadlines = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

        const originalCount = netaItems.length;
        
        netaItems = netaItems.filter(item => {
            if (item.isPermanent) {
                return true; // 無期限のものは残す
            }
            const deadlineDate = new Date(item.deadline);
            // 期限が「今日」以降のものを残す
            return deadlineDate >= today;
        });

        // 削除が発生した場合のみ保存と再描画
        if (originalCount !== netaItems.length) {
            saveNeta(); 
            renderList();
        }
    };

    // ■「追加する」ボタンが押されたときの処理
    addButton.addEventListener('click', () => {
        const text = netaInput.value.trim();
        const deadline = deadlineInput.value;
        const isPermanent = permanentCheck.checked;

        if (text === '') {
            alert('ネタの内容を入力してください。');
            return;
        }
        if (!isPermanent && deadline === '') {
            alert('期限を設定しない場合は「無期限にする」にチェックを入れてください。');
            return;
        }

        const newItem = {
            id: Date.now(), // ユニークなID
            text: text,
            deadline: isPermanent ? null : deadline,
            isPermanent: isPermanent
        };

        netaItems.push(newItem); 
        saveNeta();
        renderList(); 

        netaInput.value = '';
        deadlineInput.value = '';
        permanentCheck.checked = false;
        deadlineInput.disabled = false;
    });

    // ■「無期限」チェックボックスの処理
    permanentCheck.addEventListener('change', () => {
        deadlineInput.disabled = permanentCheck.checked;
        if (permanentCheck.checked) {
            deadlineInput.value = '';
        }
    });

    // --- ▼ここからバックアップ機能▼ ---

    // ■ エクスポート（書き出し）処理
    exportButton.addEventListener('click', () => {
        if (netaItems.length === 0) {
            alert('エクスポートするデータがありません。');
            return;
        }
        
        const dataStr = JSON.stringify(netaItems, null, 2); // データをJSON文字列に
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `neta_backup_${new Date().toISOString().split('T')[0]}.json`; //例: neta_backup_2025-11-22.json
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ■ インポート（読み込み）ボタンが押されたら、非表示のファイル選択を実行
    importButton.addEventListener('click', () => {
        if (netaItems.length > 0) {
            if (!confirm('現在のリストにデータを追加します。\n(同じ内容が重複する可能性があります)\n\n※現在のリストを消去してから読み込みたい場合は、先にすべてのネタを手動で削除してください。\n\nよろしいですか？')) {
                return;
            }
        }
        importFile.click(); // ファイル選択ダイアログを開く
    });

    // ■ ファイルが選択されたときの処理
    importFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (Array.isArray(importedData)) {
                    // IDが重複しないように、新しいデータには新しいIDを振り直す（簡易的な対応）
                    const newData = importedData.map(item => ({
                        ...item,
                        id: Date.now() + Math.random() // IDの重複を避ける
                    }));

                    // 現在のデータと結合する
                    netaItems = netaItems.concat(newData);
                    
                    saveNeta();
                    renderList();
                    alert(`${importedData.length} 件のネタを読み込みました。`);
                } else {
                    alert('ファイルの形式が正しくありません。');
                }
            } catch (error) {
                alert('ファイルの読み込みに失敗しました: ' + error.message);
            }
            // 同じファイルを連続で読み込めるようにリセット
            importFile.value = null; 
        };
        reader.readAsText(file);
    });

    // --- アプリの起動処理 ---
    checkDeadlines(); // 起動時に期限切れをチェック＆削除
    renderList(); // 最初のリスト表示
    
    // 1分ごとに期限切れをチェック
    setInterval(checkDeadlines, 60000); 
});