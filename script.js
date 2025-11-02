let produtos = {};
let carrinho = [];
let valorTotal = 0.0;
let config = {
    chavePix: ""
};
let currentTheme = 'light';
let dadosVendaPendente = null;
let totalAPagar = 0.0;
let descontoAplicado = 0.0;

function carregarDados() {
    const produtosSalvos = localStorage.getItem("caixa_produtos");
    if (produtosSalvos) {
        produtos = JSON.parse(produtosSalvos);
    } else {
        produtos = {
            "feijão": {"preco": 10.00, "estoque": 50},
            "sal": {"preco": 1.00, "estoque": 100},
            "arroz": {"preco": 10.00, "estoque": 40},
            "açucar": {"preco": 8.90, "estoque": 60},
            "macarrão": {"preco": 11.50, "estoque": 30},
            "cuzcuz": {"preco": 10.30, "estoque": 70},
            "manteiga": {"preco": 9.00, "estoque": 25}
        };
        salvarProdutos();
    }
    
    const configSalva = localStorage.getItem("caixa_config");
    if (configSalva) {
        config = JSON.parse(configSalva);
        document.getElementById('config-chave-pix').value = config.chavePix || "";
    }
}

function salvarProdutos() {
    localStorage.setItem("caixa_produtos", JSON.stringify(produtos));
    renderizarBuscaProdutos();
    renderizarTabelaProdutos();
}

function salvarVenda(venda) {
    let historico = JSON.parse(localStorage.getItem("caixa_vendas")) || [];
    historico.unshift(venda);
    localStorage.setItem("caixa_vendas", JSON.stringify(historico));
    renderizarHistoricoVendas();
}

function carregarVendas() {
    return JSON.parse(localStorage.getItem("caixa_vendas")) || [];
}

function salvarConfig() {
    config.chavePix = document.getElementById('config-chave-pix').value.trim();
    localStorage.setItem("caixa_config", JSON.stringify(config));
    alert("Configurações salvas!");
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('caixa_theme', currentTheme);
    document.getElementById('btn-toggle-theme').innerText = currentTheme === 'light' ? 'Ativar Modo Noturno' : 'Ativar Modo Claro';
}

function renderizarCarrinho() {
    const listaCarrinho = document.getElementById('lista-carrinho');
    listaCarrinho.innerHTML = "";
    valorTotal = 0.0;

    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = "<li>Carrinho vazio.</li>";
    }

    carrinho.forEach((item, index) => {
        const itemTotal = item.preco_unitario * item.quantidade;
        valorTotal += itemTotal;

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-info">
                <span>${item.nome}</span><br>
                ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = <strong>R$ ${itemTotal.toFixed(2)}</strong>
            </div>
            <div class="item-acoes">
                <button class="btn btn-aviso" onclick="abrirModalAjuste(${index})" title="Ajustar Quantidade">✏️</button>
                <button class="btn btn-perigo" onclick="removerProdutoDoCarrinho(${index})" title="Remover Item">🗑️</button>
            </div>
        `;
        listaCarrinho.appendChild(li);
    });

    document.getElementById('label-valor-total').innerText = `TOTAL: R$ ${valorTotal.toFixed(2)}`;
    
    document.getElementById('entrada-produto').value = "";
    document.getElementById('entrada-quantidade').value = "1";
    document.getElementById('entrada-produto').focus();
}

function renderizarBuscaProdutos() {
    const termoBusca = document.getElementById('entrada-busca-produto').value.trim().toLowerCase();
    const listaBusca = document.getElementById('lista-busca-produtos');
    listaBusca.innerHTML = "";
    let encontrados = 0;
    
    Object.keys(produtos).sort().forEach(nome => {
        const dados = produtos[nome];
        if (termoBusca === "" || nome.includes(termoBusca)) {
            const li = document.createElement('li');
            li.innerText = `${nome.charAt(0).toUpperCase() + nome.slice(1)} - R$ ${dados.preco.toFixed(2)} (Estoque: ${dados.estoque})`;
            li.onclick = () => selecionarProdutoBusca(nome);
            listaBusca.appendChild(li);
            encontrados++;
        }
    });

    if (encontrados === 0) {
        listaBusca.innerHTML = "<li>Nenhum produto encontrado.</li>";
    }
}

function renderizarTabelaProdutos() {
    const tabelaProdutos = document.getElementById('tabela-produtos');
    tabelaProdutos.innerHTML = "";
    
    Object.keys(produtos).sort().forEach(nome => {
        const dados = produtos[nome];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${nome.charAt(0).toUpperCase() + nome.slice(1)}</td>
            <td class="col-numero">R$ ${dados.preco.toFixed(2)}</td>
            <td class="col-numero">${dados.estoque}</td>
            <td class="col-acoes">
                <button class="btn btn-aviso" onclick="carregarProdutoParaEdicao('${nome}')">✏️</button>
                <button class="btn btn-perigo" onclick="removerProdutoDB('${nome}')">🗑️</button>
            </td>
        `;
        tabelaProdutos.appendChild(tr);
    });
}

function renderizarHistoricoVendas() {
    const tabelaHistorico = document.getElementById('tabela-historico');
    const historico = carregarVendas();
    tabelaHistorico.innerHTML = "";

    if (historico.length === 0) {
        tabelaHistorico.innerHTML = '<tr><td colspan="5">Nenhuma venda registrada.</td></tr>';
        return;
    }

    historico.forEach(venda => {
        const tr = document.createElement('tr');
        const itensStr = venda.itens.map(item => `${item.nome} (x${item.quantidade})`).join('; ');
        tr.innerHTML = `
            <td>${venda.dataHora}</td>
            <td>R$ ${venda.total.toFixed(2)}</td>
            <td>R$ ${venda.desconto.toFixed(2)}</td>
            <td>${venda.metodoPagamento}</td>
            <td>${itensStr}</td>
        `;
        tabelaHistorico.appendChild(tr);
    });
}

function adicionarProduto() {
    const nomeProduto = document.getElementById('entrada-produto').value.trim().toLowerCase();
    let quantidade;
    
    try {
        quantidade = parseInt(document.getElementById('entrada-quantidade').value);
        if (isNaN(quantidade) || quantidade <= 0) {
            throw new Error("A quantidade deve ser um número positivo.");
        }
    } catch (e) {
        alert(`Digite uma quantidade válida: ${e.message}`);
        return;
    }

    if (nomeProduto in produtos) {
        const dadosProduto = produtos[nomeProduto];
        const estoqueDisponivel = dadosProduto.estoque;

        let qtdeJaNoCarrinho = 0;
        const itemExistente = carrinho.find(item => item.nome === nomeProduto);
        if (itemExistente) {
            qtdeJaNoCarrinho = itemExistente.quantidade;
        }

        if ((quantidade + qtdeJaNoCarrinho) > estoqueDisponivel) {
            alert(`Estoque insuficiente. Você já tem ${qtdeJaNoCarrinho} no carrinho. Apenas ${estoqueDisponivel} unidades de '${nomeProduto}' em estoque.`);
            return;
        }

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({
                nome: nomeProduto,
                quantidade: quantidade,
                preco_unitario: dadosProduto.preco
            });
        }
        renderizarCarrinho();
    } else {
        alert(`Produto '${nomeProduto}' não cadastrado.`);
    }
}

function removerProdutoDoCarrinho(index) {
    if (confirm(`Tem certeza que deseja remover '${carrinho[index].nome}' do carrinho?`)) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
    }
}

function abrirModalAjuste(index) {
    const item = carrinho[index];
    document.getElementById('ajustar-titulo').innerText = `Ajustar Quantidade de '${item.nome}'`;
    document.getElementById('ajustar-index-carrinho').value = index;
    document.getElementById('ajustar-nova-qtde').value = item.quantidade;
    document.getElementById('ajustar-nova-qtde').max = produtos[item.nome].estoque;
    document.getElementById('modal-ajustar-qtde').showModal();
}

function confirmarAjusteQuantidade() {
    const index = document.getElementById('ajustar-index-carrinho').value;
    const item = carrinho[index];
    let novaQuantidade;
    
    try {
        novaQuantidade = parseInt(document.getElementById('ajustar-nova-qtde').value);
        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
            throw new Error("Quantidade inválida.");
        }
    } catch (e) {
        alert(e.message);
        return;
    }
    
    if (novaQuantidade === 0) {
        removerProdutoDoCarrinho(index);
    } else {
        const estoqueDisponivel = produtos[item.nome].estoque;
        if (novaQuantidade > estoqueDisponivel) {
            alert(`Estoque insuficiente. Apenas ${estoqueDisponivel} unidades em estoque.`);
            return;
        }
        item.quantidade = novaQuantidade;
        renderizarCarrinho();
    }
    document.getElementById('modal-ajustar-qtde').close();
}

function selecionarProdutoBusca(nome) {
    document.getElementById('entrada-produto').value = nome;
    document.getElementById('entrada-quantidade').value = "1";
    document.getElementById('entrada-quantidade').focus();
}

function limparCarrinho() {
    if (confirm("Tem certeza que deseja limpar o carrinho?")) {
        carrinho = [];
        renderizarCarrinho();
    }
}

function gerarRecibo(totalFinal, metodo, troco, desconto, itens) {
    const dataHora = new Date().toLocaleString("pt-BR");
    let reciboTexto = `--- RECIBO DE VENDA ---\n`;
    reciboTexto += `Data/Hora: ${dataHora}\n`;
    reciboTexto += "-----------------------\n";
    reciboTexto += `${'Item'.padEnd(15)} ${'Qtd'.padEnd(5)} ${'Unit.'.padEnd(8)} ${'Total'.padEnd(8)}\n`;
    reciboTexto += "-----------------------\n";
    for (const item of itens) {
        const totalItem = (item.quantidade * item.preco_unitario).toFixed(2);
        reciboTexto += `${item.nome.padEnd(15)} ${String(item.quantidade).padEnd(5)} R$ ${item.preco_unitario.toFixed(2).padEnd(6)} R$ ${totalItem.padEnd(8)}\n`;
    }
    reciboTexto += "-----------------------\n";
    if (desconto > 0) {
        reciboTexto += `Desconto: R$ ${desconto.toFixed(2)}\n`;
    }
    reciboTexto += `TOTAL: R$ ${totalFinal.toFixed(2)}\n`;
    reciboTexto += `Método de Pagamento: ${metodo}\n`;
    if (troco > 0) {
        reciboTexto += `Troco: R$ ${troco.toFixed(2)}\n`;
    }
    reciboTexto += "-----------------------\n";
    reciboTexto += "Obrigado(a) pela preferência!\n";
    
    document.getElementById('recibo-texto').value = reciboTexto;
    return reciboTexto;
}

function salvarReciboArquivo() {
    const reciboTexto = document.getElementById('recibo-texto').value;
    if (!reciboTexto) {
        alert("Não há recibo para salvar.");
        return;
    }
    const dataHoraArq = new Date().toISOString().slice(0, 19).replace(/:/g, "-").replace("T", "_");
    const nomeArquivo = `nota_fiscal_${dataHoraArq}.txt`;
    
    const blob = new Blob([reciboTexto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(link.href);
}

function limparFormularioGP() {
    document.getElementById('gp-id-produto').value = "";
    document.getElementById('gp-nome').value = "";
    document.getElementById('gp-preco').value = "";
    document.getElementById('gp-estoque').value = "";
    document.getElementById('gp-nome').focus();
}

function salvarProdutoDB(event) {
    event.preventDefault();
    
    const nomeAntigo = document.getElementById('gp-id-produto').value.trim().toLowerCase();
    const nome = document.getElementById('gp-nome').value.trim().toLowerCase();
    let preco, estoque;

    try {
        preco = parseFloat(document.getElementById('gp-preco').value);
        estoque = parseInt(document.getElementById('gp-estoque').value);
        if (!nome) throw new Error("O nome é obrigatório.");
        if (isNaN(preco) || preco <= 0) throw new Error("Preço inválido.");
        if (isNaN(estoque) || estoque < 0) throw new Error("Estoque inválido.");
    } catch (e) {
        alert(`Erro: ${e.message}`);
        return;
    }

    if (nomeAntigo && nomeAntigo !== nome && produtos[nomeAntigo]) {
        delete produtos[nomeAntigo];
    }
    
    produtos[nome] = { "preco": preco, "estoque": estoque };
    salvarProdutos();
    limparFormularioGP();
    alert(`Produto '${nome}' salvo com sucesso!`);
}

function carregarProdutoParaEdicao(nome) {
    if (produtos[nome]) {
        const dados = produtos[nome];
        document.getElementById('gp-id-produto').value = nome;
        document.getElementById('gp-nome').value = nome;
        document.getElementById('gp-preco').value = dados.preco;
        document.getElementById('gp-estoque').value = dados.estoque;
    }
}

function removerProdutoDB(nome) {
    if (confirm(`Tem certeza que deseja remover o produto '${nome}' do banco de dados?`)) {
        delete produtos[nome];
        salvarProdutos();
        limparFormularioGP();
        alert(`Produto '${nome}' removido.`);
    }
}

function abrirTelaPagamento() {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }
    
    totalAPagar = valorTotal;
    descontoAplicado = 0.0;

    document.getElementById('pag-valor-original').innerText = `R$ ${valorTotal.toFixed(2)}`;
    document.getElementById('pag-desconto').value = "";
    document.getElementById('pag-valor-desconto').innerText = `- R$ 0.00`;
    document.getElementById('pag-total-final').innerText = `R$ ${valorTotal.toFixed(2)}`;
    
    document.querySelector('input[name="metodo-pagamento"][value="Dinheiro"]').checked = true;
    toggleCamposDinheiro();
    
    document.getElementById('pag-valor-recebido').value = "";
    document.getElementById('pag-troco').innerText = "R$ 0.00";
    
    document.getElementById('modal-pagamento').showModal();
}

function aplicarDesconto() {
    const descontoStr = document.getElementById('pag-desconto').value.trim();
    totalAPagar = valorTotal;
    descontoAplicado = 0.0;
    
    try {
        if (descontoStr.includes('%')) {
            const percentual = parseFloat(descontoStr.replace('%', ''));
            if (isNaN(percentual) || percentual < 0 || percentual > 100) throw new Error("Percentual inválido.");
            descontoAplicado = (valorTotal * percentual) / 100;
        } else if (descontoStr) {
            const valorFixo = parseFloat(descontoStr);
            if (isNaN(valorFixo) || valorFixo < 0) throw new Error("Valor fixo inválido.");
            descontoAplicado = Math.min(valorFixo, valorTotal);
        }
        
        totalAPagar = valorTotal - descontoAplicado;
        
        document.getElementById('pag-valor-desconto').innerText = `- R$ ${descontoAplicado.toFixed(2)}`;
        document.getElementById('pag-total-final').innerText = `R$ ${totalAPagar.toFixed(2)}`;
        
    } catch(e) {
        alert(`Erro no desconto: ${e.message}`);
        document.getElementById('pag-desconto').value = "";
        document.getElementById('pag-valor-desconto').innerText = `- R$ 0.00`;
        document.getElementById('pag-total-final').innerText = `R$ ${valorTotal.toFixed(2)}`;
    }
    calcularTroco();
}

function toggleCamposDinheiro() {
    const metodo = document.querySelector('input[name="metodo-pagamento"]:checked').value;
    const camposDinheiro = document.getElementById('campos-dinheiro');
    if (metodo === 'Dinheiro') {
        camposDinheiro.style.display = 'block';
    } else {
        camposDinheiro.style.display = 'none';
    }
}

function calcularTroco() {
    const labelTroco = document.getElementById('pag-troco');
    try {
        const valorRecebido = parseFloat(document.getElementById('pag-valor-recebido').value);
        if (isNaN(valorRecebido)) {
            labelTroco.innerText = "R$ 0.00";
            labelTroco.style.color = 'var(--cor-sucesso)';
            return 0;
        }
        
        const troco = valorRecebido - totalAPagar;
        
        if (troco < 0) {
            labelTroco.innerText = `Falta: R$ ${(-troco).toFixed(2)}`;
            labelTroco.style.color = 'var(--cor-perigo)';
        } else {
            labelTroco.innerText = `R$ ${troco.toFixed(2)}`;
            labelTroco.style.color = 'var(--cor-sucesso)';
        }
        return troco;
    } catch {
        labelTroco.innerText = "Inválido";
        labelTroco.style.color = 'var(--cor-perigo)';
        return 0;
    }
}

function mostrarModalPix() {
    if (!config.chavePix) {
        alert("Nenhuma chave PIX cadastrada. Vá em Configurações para adicionar uma.");
        return;
    }
    
    dadosVendaPendente = {
        total: totalAPagar,
        metodo: 'Pix',
        troco: 0,
        desconto: descontoAplicado,
        itens: [...carrinho]
    };
    
    document.getElementById('total-pix-valor').innerText = `TOTAL A PAGAR: R$ ${totalAPagar.toFixed(2)}`;
    document.getElementById('info-pix-key').innerText = `Chave: ${config.chavePix}`;
    
    const qrContainer = document.getElementById('qr-code-pix');
    qrContainer.innerHTML = "";
    
    try {
        const qr = qrcode(0, 'L');
        qr.addData(config.chavePix);
        qr.make();
        qrContainer.innerHTML = qr.createImgTag(6, 10);
    } catch (e) {
        console.error("Erro ao gerar QR Code:", e);
        qrContainer.innerText = "Erro ao gerar QR Code.";
    }
    
    document.getElementById('modal-pagamento').close();
    document.getElementById('modal-pix').showModal();
}

function confirmarRecebimentoPix() {
    if (dadosVendaPendente) {
        processarVenda(dadosVendaPendente);
        dadosVendaPendente = null;
        document.getElementById('modal-pix').close();
    }
}

function cancelarVendaPix() {
    if (confirm("Tem certeza que deseja cancelar esta venda? O carrinho não será limpo.")) {
        dadosVendaPendente = null;
        document.getElementById('modal-pix').close();
    }
}

function confirmarPagamento() {
    const metodo = document.querySelector('input[name="metodo-pagamento"]:checked').value;
    let troco = 0.0;
    
    if (metodo === "Dinheiro") {
        troco = calcularTroco();
        if (troco < 0) {
            alert("Pagamento insuficiente. Faltam R$ " + (-troco).toFixed(2));
            return;
        }
    }
    
    if (metodo === "Pix") {
        mostrarModalPix();
        return;
    }
    
    const dadosVenda = {
        total: totalAPagar,
        metodo: metodo,
        troco: troco,
        desconto: descontoAplicado,
        itens: [...carrinho]
    };
    
    processarVenda(dadosVenda);
    document.getElementById('modal-pagamento').close();
}

function processarVenda(dados) {
    for (const item of dados.itens) {
        if (produtos[item.nome]) {
            produtos[item.nome].estoque -= item.quantidade;
        }
    }
    salvarProdutos();

    const dataHora = new Date().toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' });
    const vendaRegistrada = {
        dataHora: dataHora,
        total: dados.total,
        desconto: dados.desconto,
        metodoPagamento: dados.metodo,
        itens: dados.itens.map(item => ({ nome: item.nome, quantidade: item.quantidade }))
    };
    salvarVenda(vendaRegistrada);

    gerarRecibo(dados.total, dados.metodo, dados.troco, dados.desconto, dados.itens);
    
    carrinho = [];
    renderizarCarrinho();
    
    alert(`Venda finalizada com sucesso!\nTotal: R$ ${dados.total.toFixed(2)}\nTroco: R$ ${dados.troco.toFixed(2)}`);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('caixa_theme') || 'light';
    currentTheme = savedTheme;
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('btn-toggle-theme').innerText = savedTheme === 'light' ? 'Ativar Modo Noturno' : 'Ativar Modo Claro';

    carregarDados();
    renderizarCarrinho();
    renderizarBuscaProdutos();
    renderizarTabelaProdutos();
    renderizarHistoricoVendas();

    document.getElementById('btn-adicionar-carrinho').onclick = adicionarProduto;
    document.getElementById('entrada-busca-produto').onkeyup = renderizarBuscaProdutos;
    document.getElementById('btn-finalizar-venda').onclick = abrirTelaPagamento;
    document.getElementById('btn-limpar-carrinho').onclick = limparCarrinho;
    
    document.getElementById('entrada-produto').onkeypress = (e) => {
        if (e.key === 'Enter') document.getElementById('entrada-quantidade').focus();
    };
    document.getElementById('entrada-quantidade').onkeypress = (e) => {
        if (e.key === 'Enter') adicionarProduto();
    };

    document.querySelectorAll('.tab-button').forEach(button => {
        button.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        };
    });
    
    document.getElementById('btn-salvar-recibo').onclick = salvarReciboArquivo;
    
    document.getElementById('form-gerenciar-produto').onsubmit = salvarProdutoDB;
    document.getElementById('btn-limpar-form-gp').onclick = limparFormularioGP;

    document.getElementById('btn-toggle-theme').onclick = toggleTheme;
    document.getElementById('btn-salvar-config').onclick = salvarConfig;

    document.getElementById('btn-aplicar-desconto').onclick = aplicarDesconto;
    document.getElementById('pag-desconto').onkeypress = (e) => {
        if (e.key === 'Enter') aplicarDesconto();
    };
    document.querySelectorAll('input[name="metodo-pagamento"]').forEach(radio => {
        radio.onchange = toggleCamposDinheiro;
    });
    document.getElementById('pag-valor-recebido').onkeyup = calcularTroco;
    document.getElementById('btn-cancelar-pagamento').onclick = () => {
        document.getElementById('modal-pagamento').close();
    };
    document.getElementById('btn-confirmar-pagamento').onclick = confirmarPagamento;

    document.getElementById('btn-cancelar-ajuste').onclick = () => {
        document.getElementById('modal-ajustar-qtde').close();
    };
    document.getElementById('btn-confirmar-ajuste').onclick = confirmarAjusteQuantidade;
    
    document.getElementById('btn-pix-cancelar').onclick = cancelarVendaPix;
    document.getElementById('btn-pix-confirmado').onclick = confirmarRecebimentoPix;
});